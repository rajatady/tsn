/* ─── Spacer (used in layout) ────────────────────────────────────── */
@interface UISpacer : NSView @end
@implementation UISpacer @end

/* ─── Aspect Ratio ──────────────────────────────────────────────── */

static char kAspectRatioKey;

static CGFloat aspect_height(NSView *view, CGFloat width) {
    NSValue *val = objc_getAssociatedObject(view, &kAspectRatioKey);
    if (!val) return -1;
    NSSize ratio = [val sizeValue];
    if (ratio.width <= 0) return -1;
    return width * ratio.height / ratio.width;
}

/* ─── Stack Layout View (Yoga-backed) ───────────────────────────── */

@interface UIStackContainer : NSView
@property int direction;  /* 0=V, 1=H, 2=Z — only used for ZStack detection in ui_add_child */
@property (nonatomic, assign) YGNodeRef ygNode;
@property (nonatomic, strong) NSMutableArray<NSView *> *children;
@end

/* ─── Text measurement callback for Yoga ────────────────────────── */

static CGFloat css_line_height(NSTextField *field) {
    CGFloat fs = field.font.pointSize;
    CGFloat lh = fs * 1.5;
    NSAttributedString *attr = field.attributedStringValue;
    if (attr.length > 0) {
        NSParagraphStyle *ps = [attr attribute:NSParagraphStyleAttributeName atIndex:0 effectiveRange:NULL];
        if (ps && ps.maximumLineHeight > 0) lh = ps.maximumLineHeight;
    }
    return lh;
}

static YGSize yoga_measure_func(YGNodeConstRef node, float width, YGMeasureMode widthMode,
                                float height, YGMeasureMode heightMode) {
    NSView *view = (__bridge NSView *)YGNodeGetContext((YGNodeRef)node);
    YGSize result = { .width = 0, .height = 0 };

    if ([view isKindOfClass:[NSTextField class]]) {
        NSTextField *field = (NSTextField *)view;
        CGFloat cssLH = css_line_height(field);
        CGFloat availW = (widthMode == YGMeasureModeUndefined) ? CGFLOAT_MAX : width;

        if (field.maximumNumberOfLines == 1) {
            NSSize intrinsic = field.intrinsicContentSize;
            result.width = (widthMode == YGMeasureModeUndefined) ? intrinsic.width : width;
            result.height = cssLH;
        } else {
            CGFloat cellH = [[field cell] cellSizeForBounds:NSMakeRect(0, 0, availW, CGFLOAT_MAX)].height;
            int nlines = MAX(1, (int)floor(cellH / cssLH + 0.1));
            NSSize intrinsic = field.intrinsicContentSize;
            result.width = (widthMode == YGMeasureModeUndefined) ? intrinsic.width : width;
            result.height = nlines * cssLH;
        }
    } else if ([view isKindOfClass:[NSImageView class]]) {
        CGFloat fw = view.frame.size.width, fh = view.frame.size.height;
        NSSize intrinsic = view.intrinsicContentSize;
        result.width = (fw > 0) ? fw : (intrinsic.width > 0 ? intrinsic.width : 100);
        result.height = (fh > 0) ? fh : (intrinsic.height > 0 ? intrinsic.height : 100);
    } else if ([view isKindOfClass:[NSBox class]]) {
        result.width = width;
        result.height = 1;
    } else {
        NSSize intrinsic = view.intrinsicContentSize;
        CGFloat fw = view.frame.size.width, fh = view.frame.size.height;
        result.width = (fw > 0) ? fw : (intrinsic.width > 0 ? intrinsic.width : 60);
        result.height = (fh > 0) ? fh : (intrinsic.height > 0 ? intrinsic.height : 24);
    }

    return result;
}

/* ─── Apply Yoga layout results to NSView tree ──────────────────── */

static void yoga_apply_layout(UIStackContainer *container) {
    YGNodeRef node = container.ygNode;
    NSUInteger childCount = container.children.count;

    for (NSUInteger i = 0; i < childCount; i++) {
        NSView *child = container.children[i];
        YGNodeRef childNode = YGNodeGetChild(node, (uint32_t)i);
        if (!childNode) continue;

        CGFloat cx = YGNodeLayoutGetLeft(childNode);
        CGFloat cy = YGNodeLayoutGetTop(childNode);
        CGFloat cw = YGNodeLayoutGetWidth(childNode);
        CGFloat ch = YGNodeLayoutGetHeight(childNode);

        child.frame = NSMakeRect(cx, cy, cw, ch);

        if ([child isKindOfClass:[UIStackContainer class]]) {
            yoga_apply_layout((UIStackContainer *)child);
        } else if ([child isKindOfClass:[NSVisualEffectView class]]) {
            for (NSView *sub in child.subviews) {
                sub.frame = child.bounds;
                if ([sub isKindOfClass:[UIStackContainer class]]) {
                    yoga_apply_layout((UIStackContainer *)sub);
                }
            }
        } else if ([child isKindOfClass:[NSScrollView class]]) {
            NSScrollView *sv = (NSScrollView *)child;
            NSView *doc = sv.documentView;
            for (NSView *sub in child.subviews) sub.frame = child.bounds;
            if ([doc isKindOfClass:[UIStackContainer class]]) {
                UIStackContainer *stack = (UIStackContainer *)doc;
                BOOL horizontal = sv.hasHorizontalScroller && !sv.hasVerticalScroller;
                YGNodeRef docNode = stack.ygNode;
                if (docNode) {
                    if (horizontal) {
                        YGNodeCalculateLayout(docNode, YGUndefined, ch, YGDirectionLTR);
                    } else {
                        YGNodeCalculateLayout(docNode, cw, YGUndefined, YGDirectionLTR);
                    }
                    CGFloat docW = YGNodeLayoutGetWidth(docNode);
                    CGFloat docH = YGNodeLayoutGetHeight(docNode);
                    if (horizontal) {
                        doc.frame = NSMakeRect(0, 0, docW > 0 ? docW : cw, ch);
                    } else {
                        doc.frame = NSMakeRect(0, 0, cw, docH > 0 ? docH : ch);
                    }
                    yoga_apply_layout(stack);
                }
            }
        }
    }
}

@implementation UIStackContainer
- (instancetype)init {
    self = [super init];
    _children = [NSMutableArray new];
    _direction = 0;
    _ygNode = YGNodeNew();
    YGNodeStyleSetFlexDirection(_ygNode, YGFlexDirectionColumn);
    YGNodeStyleSetAlignItems(_ygNode, YGAlignStretch);
    return self;
}
- (BOOL)isFlipped { return YES; }

- (void)dealloc {
    if (_ygNode) {
        YGNodeFree(_ygNode);
        _ygNode = NULL;
    }
}

- (void)layout {
    [super layout];
    NSRect b = self.bounds;
    if (b.size.width <= 0 || b.size.height <= 0) return;
    YGNodeCalculateLayout(_ygNode, b.size.width, b.size.height, YGDirectionLTR);
    yoga_apply_layout(self);
}
@end

/* ─── Layout Functions ──────────────────────────────────────────── */

UIHandle ui_vstack(void) {
    UIStackContainer *s = [UIStackContainer new];
    s.direction = 0;
    YGNodeStyleSetFlexDirection(s.ygNode, YGFlexDirectionColumn);
    retain_render(s);
    return (__bridge UIHandle)s;
}

UIHandle ui_hstack(void) {
    UIStackContainer *s = [UIStackContainer new];
    s.direction = 1;
    YGNodeStyleSetFlexDirection(s.ygNode, YGFlexDirectionRow);
    retain_render(s);
    return (__bridge UIHandle)s;
}

UIHandle ui_zstack(void) {
    UIStackContainer *s = [UIStackContainer new];
    s.direction = 2;
    s.wantsLayer = YES;
    s.layer.masksToBounds = YES;
    YGNodeStyleSetFlexDirection(s.ygNode, YGFlexDirectionColumn);
    retain_render(s);
    return (__bridge UIHandle)s;
}

void ui_set_aspect(UIHandle v, int w, int h) {
    NSView *view = (__bridge NSView *)v;
    NSValue *val = [NSValue valueWithSize:NSMakeSize(w, h)];
    objc_setAssociatedObject(view, &kAspectRatioKey, val, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    if ([view isKindOfClass:[UIStackContainer class]]) {
        YGNodeStyleSetAspectRatio(((UIStackContainer *)view).ygNode, (float)w / (float)h);
    }
}

void ui_set_clip(UIHandle v, int clip) {
    NSView *view = (__bridge NSView *)v;
    view.wantsLayer = YES;
    view.layer.masksToBounds = (clip != 0);
}

void ui_set_gradient(UIHandle v, double r1, double g1, double b1, double a1,
                     double r2, double g2, double b2, double a2, int direction) {
    NSView *view = (__bridge NSView *)v;
    view.wantsLayer = YES;
    CAGradientLayer *gl = [CAGradientLayer layer];
    gl.colors = @[
        (id)[NSColor colorWithRed:r1 green:g1 blue:b1 alpha:a1].CGColor,
        (id)[NSColor colorWithRed:r2 green:g2 blue:b2 alpha:a2].CGColor,
    ];
    if (direction == 0) { gl.startPoint = CGPointMake(0.5, 1); gl.endPoint = CGPointMake(0.5, 0); }
    else if (direction == 1) { gl.startPoint = CGPointMake(0.5, 0); gl.endPoint = CGPointMake(0.5, 1); }
    else if (direction == 2) { gl.startPoint = CGPointMake(1, 0.5); gl.endPoint = CGPointMake(0, 0.5); }
    else { gl.startPoint = CGPointMake(0, 0.5); gl.endPoint = CGPointMake(1, 0.5); }
    gl.frame = view.bounds;
    gl.autoresizingMask = kCALayerWidthSizable | kCALayerHeightSizable;
    [view.layer addSublayer:gl];
}

void ui_set_padding(UIHandle v, int t, int r, int b, int l) {
    NSView *view = (__bridge NSView *)v;
    if ([view isKindOfClass:[UIStackContainer class]]) {
        YGNodeRef node = ((UIStackContainer *)view).ygNode;
        YGNodeStyleSetPadding(node, YGEdgeTop, t);
        YGNodeStyleSetPadding(node, YGEdgeRight, r);
        YGNodeStyleSetPadding(node, YGEdgeBottom, b);
        YGNodeStyleSetPadding(node, YGEdgeLeft, l);
    }
}

void ui_set_spacing(UIHandle v, int sp) {
    NSView *view = (__bridge NSView *)v;
    if ([view isKindOfClass:[UIStackContainer class]]) {
        YGNodeStyleSetGap(((UIStackContainer *)view).ygNode, YGGutterAll, sp);
    }
}

void ui_set_flex(UIHandle v, int f) {
    NSView *view = (__bridge NSView *)v;
    if ([view isKindOfClass:[UIStackContainer class]]) {
        YGNodeStyleSetFlexGrow(((UIStackContainer *)view).ygNode, (float)f);
    }
}

void ui_set_size(UIHandle v, int w, int h) {
    NSView *view = (__bridge NSView *)v;
    if ([view isKindOfClass:[UIStackContainer class]]) {
        YGNodeRef node = ((UIStackContainer *)view).ygNode;
        if (w >= 0) YGNodeStyleSetWidth(node, w);
        if (h >= 0) YGNodeStyleSetHeight(node, h);
        return;
    }
    /* Leaf views: set frame directly (measure func will read it) */
    NSRect frame = view.frame;
    if (w >= 0) frame.size.width = w;
    if (h >= 0) frame.size.height = h;
    view.frame = frame;
}

void ui_set_min_size(UIHandle v, int w, int h) {
    NSView *view = (__bridge NSView *)v;
    if ([view isKindOfClass:[UIStackContainer class]]) {
        YGNodeRef node = ((UIStackContainer *)view).ygNode;
        if (w >= 0) YGNodeStyleSetMinWidth(node, w);
        if (h >= 0) YGNodeStyleSetMinHeight(node, h);
    }
}

void ui_set_max_size(UIHandle v, int w, int h) {
    NSView *view = (__bridge NSView *)v;
    if ([view isKindOfClass:[UIStackContainer class]]) {
        YGNodeRef node = ((UIStackContainer *)view).ygNode;
        if (w >= 0) YGNodeStyleSetMaxWidth(node, w);
        if (h >= 0) YGNodeStyleSetMaxHeight(node, h);
    }
}

void ui_set_alignment(UIHandle v, int a) {
    NSView *view = (__bridge NSView *)v;
    if ([view isKindOfClass:[UIStackContainer class]]) {
        YGAlign yogaAlign = YGAlignAuto;
        if (a == 1) yogaAlign = YGAlignCenter;
        else if (a == 2) yogaAlign = YGAlignFlexEnd;
        YGNodeStyleSetAlignSelf(((UIStackContainer *)view).ygNode, yogaAlign);
    }
}

void ui_set_align_items(UIHandle v, int a) {
    NSView *view = (__bridge NSView *)v;
    if ([view isKindOfClass:[UIStackContainer class]]) {
        YGAlign yogaAlign = YGAlignStretch;
        if (a == 0) yogaAlign = YGAlignFlexStart;
        else if (a == 1) yogaAlign = YGAlignCenter;
        else if (a == 2) yogaAlign = YGAlignFlexEnd;
        YGNodeStyleSetAlignItems(((UIStackContainer *)view).ygNode, yogaAlign);
    }
}

void ui_set_justify_content(UIHandle v, int j) {
    NSView *view = (__bridge NSView *)v;
    if ([view isKindOfClass:[UIStackContainer class]]) {
        YGJustify yogaJustify = YGJustifyFlexStart;
        if (j == 1) yogaJustify = YGJustifyCenter;
        else if (j == 2) yogaJustify = YGJustifyFlexEnd;
        else if (j == 3) yogaJustify = YGJustifySpaceBetween;
        YGNodeStyleSetJustifyContent(((UIStackContainer *)view).ygNode, yogaJustify);
    }
}

/* Helper: create a Yoga leaf node for a non-container NSView */
static YGNodeRef yoga_leaf_node_for_view(NSView *view) {
    YGNodeRef leafNode = YGNodeNew();
    YGNodeSetContext(leafNode, (__bridge void *)view);
    YGNodeSetMeasureFunc(leafNode, yoga_measure_func);

    CGFloat fw = view.frame.size.width;
    CGFloat fh = view.frame.size.height;
    if (fw > 0) YGNodeStyleSetWidth(leafNode, fw);
    if (fh > 0) YGNodeStyleSetHeight(leafNode, fh);

    NSValue *aspectVal = objc_getAssociatedObject(view, &kAspectRatioKey);
    if (aspectVal) {
        NSSize ratio = [aspectVal sizeValue];
        if (ratio.width > 0) {
            YGNodeStyleSetAspectRatio(leafNode, ratio.width / ratio.height);
        }
    }

    return leafNode;
}

void ui_add_child(UIHandle parent, UIHandle child) {
    NSView *p = (__bridge NSView *)parent;
    NSView *c = (__bridge NSView *)child;

    if ([p isKindOfClass:[NSWindow class]]) {
        p = ((NSWindow *)p).contentView;
    }

    if ([p isKindOfClass:[UIStackContainer class]]) {
        UIStackContainer *container = (UIStackContainer *)p;
        [container.children addObject:c];
        [p addSubview:c];

        YGNodeRef parentNode = container.ygNode;
        uint32_t idx = (uint32_t)YGNodeGetChildCount(parentNode);

        if ([c isKindOfClass:[UIStackContainer class]]) {
            UIStackContainer *childContainer = (UIStackContainer *)c;
            YGNodeInsertChild(parentNode, childContainer.ygNode, idx);

            if (container.direction == 2) {
                YGNodeStyleSetPositionType(childContainer.ygNode, YGPositionTypeAbsolute);
                YGNodeStyleSetPosition(childContainer.ygNode, YGEdgeLeft, 0);
                YGNodeStyleSetPosition(childContainer.ygNode, YGEdgeTop, 0);
                YGNodeStyleSetWidthPercent(childContainer.ygNode, 100);
                YGNodeStyleSetHeightPercent(childContainer.ygNode, 100);
            }
        } else if ([c isKindOfClass:[UISpacer class]]) {
            YGNodeRef spacerNode = YGNodeNew();
            YGNodeStyleSetFlexGrow(spacerNode, 1);
            YGNodeSetContext(spacerNode, (__bridge void *)c);
            YGNodeInsertChild(parentNode, spacerNode, idx);
        } else if ([c isKindOfClass:[NSScrollView class]]) {
            YGNodeRef scrollNode = YGNodeNew();
            YGNodeSetContext(scrollNode, (__bridge void *)c);
            /* Scroll views default to flex-grow so they fill available space */
            YGNodeStyleSetFlexGrow(scrollNode, 1);
            YGNodeInsertChild(parentNode, scrollNode, idx);

            if (container.direction == 2) {
                YGNodeStyleSetPositionType(scrollNode, YGPositionTypeAbsolute);
                YGNodeStyleSetPosition(scrollNode, YGEdgeLeft, 0);
                YGNodeStyleSetPosition(scrollNode, YGEdgeTop, 0);
                YGNodeStyleSetWidthPercent(scrollNode, 100);
                YGNodeStyleSetHeightPercent(scrollNode, 100);
            }
        } else if ([c isKindOfClass:[NSVisualEffectView class]]) {
            UIStackContainer *inner = nil;
            for (NSView *sub in c.subviews) {
                if ([sub isKindOfClass:[UIStackContainer class]]) { inner = (UIStackContainer *)sub; break; }
            }
            if (inner) {
                YGNodeInsertChild(parentNode, inner.ygNode, idx);
                if (container.direction == 2) {
                    YGNodeStyleSetPositionType(inner.ygNode, YGPositionTypeAbsolute);
                    YGNodeStyleSetPosition(inner.ygNode, YGEdgeLeft, 0);
                    YGNodeStyleSetPosition(inner.ygNode, YGEdgeTop, 0);
                    YGNodeStyleSetWidthPercent(inner.ygNode, 100);
                    YGNodeStyleSetHeightPercent(inner.ygNode, 100);
                }
            } else {
                YGNodeRef blurNode = YGNodeNew();
                YGNodeSetContext(blurNode, (__bridge void *)c);
                YGNodeInsertChild(parentNode, blurNode, idx);
            }
        } else {
            YGNodeRef leafNode = yoga_leaf_node_for_view(c);

            if (container.direction == 2) {
                YGNodeStyleSetPositionType(leafNode, YGPositionTypeAbsolute);
                YGNodeStyleSetPosition(leafNode, YGEdgeLeft, 0);
                YGNodeStyleSetPosition(leafNode, YGEdgeTop, 0);
                YGNodeStyleSetWidthPercent(leafNode, 100);
                YGNodeStyleSetHeightPercent(leafNode, 100);
            }

            YGNodeInsertChild(parentNode, leafNode, idx);
        }
    } else if ([p isKindOfClass:[NSScrollView class]]) {
        NSScrollView *sv = (NSScrollView *)p;
        sv.documentView = c;
        if ([c isKindOfClass:[UIStackContainer class]]) {
            BOOL horizontal = sv.hasHorizontalScroller && !sv.hasVerticalScroller;
            c.autoresizingMask = horizontal ? NSViewHeightSizable : NSViewWidthSizable;
        }
    } else {
        [p addSubview:c];
    }
}

UIHandle ui_spacer(void) {
    UISpacer *s = [UISpacer new];
    retain_render(s);
    return (__bridge UIHandle)s;
}

UIHandle ui_divider(void) {
    NSBox *box = [NSBox new];
    box.boxType = NSBoxSeparator;
    retain_render(box);
    return (__bridge UIHandle)box;
}

/* ─── Blur View ──────────────────────────────────────────────────── */

UIHandle ui_blur_view(int material) {
    NSVisualEffectView *vev = [NSVisualEffectView new];
    switch (material) {
        case 0: vev.material = NSVisualEffectMaterialSidebar; break;
        case 1: vev.material = NSVisualEffectMaterialHeaderView; break;
        case 2: vev.material = NSVisualEffectMaterialContentBackground; break;
        case 3: vev.material = NSVisualEffectMaterialSheet; break;
        default: vev.material = NSVisualEffectMaterialContentBackground; break;
    }
    vev.blendingMode = NSVisualEffectBlendingModeBehindWindow;
    retain_render(vev);
    return (__bridge UIHandle)vev;
}
