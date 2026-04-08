/* ─── Spacer (used in layout) ────────────────────────────────────── */
@interface UISpacer : NSView @end
@implementation UISpacer
- (BOOL)isFlipped { return YES; }
@end

/* ─── Aspect Ratio ──────────────────────────────────────────────── */

static char kAspectRatioKey;
static char kCardContainerKey;

static CGFloat aspect_height(NSView *view, CGFloat width) {
    NSValue *val = objc_getAssociatedObject(view, &kAspectRatioKey);
    if (!val) return -1;
    NSSize ratio = [val sizeValue];
    if (ratio.width <= 0) return -1;
    return width * ratio.height / ratio.width;
}

/* ─── Stack Host View ───────────────────────────────────────────── */

@interface UIStackContainer : NSView
@property int direction;  /* 0=V, 1=H, 2=Z */
@end

/* ─── Text measurement callback for Yoga ────────────────────────── */

static CGFloat default_css_line_height_for_size(CGFloat fontSize) {
    if (fontSize <= 12) return 16;
    if (fontSize <= 14) return 20;
    if (fontSize <= 16) return 24;
    if (fontSize <= 20) return 28;
    if (fontSize <= 24) return 32;
    if (fontSize <= 30) return 36;
    if (fontSize <= 36) return 40;
    return fontSize * 1.2;
}

static CGFloat css_line_height(NSTextField *field) {
    CGFloat fs = field.font.pointSize;
    CGFloat lh = default_css_line_height_for_size(fs);
    NSAttributedString *attr = field.attributedStringValue;
    if (attr.length > 0) {
        NSParagraphStyle *ps = [attr attribute:NSParagraphStyleAttributeName atIndex:0 effectiveRange:NULL];
        if (ps && ps.maximumLineHeight > 0) lh = ps.maximumLineHeight;
    }
    return lh;
}

static BOOL text_uses_custom_line_height(NSTextField *field) {
    NSAttributedString *attr = field.attributedStringValue;
    if (attr.length == 0) return NO;
    NSParagraphStyle *ps = [attr attribute:NSParagraphStyleAttributeName atIndex:0 effectiveRange:NULL];
    if (!ps || ps.maximumLineHeight <= 0) return NO;
    CGFloat defaultLH = default_css_line_height_for_size(field.font.pointSize);
    return fabs(ps.maximumLineHeight - defaultLH) > 0.5;
}

static YGSize yoga_measure_func(YGNodeConstRef node, float width, YGMeasureMode widthMode,
                                float height, YGMeasureMode heightMode);

#include "runtime/shadow_tree.inc"

static YGSize yoga_measure_func(YGNodeConstRef node, float width, YGMeasureMode widthMode,
                                float height, YGMeasureMode heightMode) {
    NSView *view = (__bridge NSView *)YGNodeGetContext((YGNodeRef)node);
    YGSize result = { .width = 0, .height = 0 };

    if ([view isKindOfClass:[NSTextField class]]) {
        NSTextField *field = (NSTextField *)view;
        CGFloat cssLH = css_line_height(field);
        CGFloat availW = (widthMode == YGMeasureModeUndefined) ? CGFLOAT_MAX : width;
        NSSize intrinsic = field.intrinsicContentSize;

        if (field.maximumNumberOfLines == 1) {
            if (widthMode == YGMeasureModeUndefined) result.width = intrinsic.width;
            else if (widthMode == YGMeasureModeAtMost) result.width = MIN(intrinsic.width, width);
            else result.width = width;
            result.height = text_uses_custom_line_height(field) ? cssLH : intrinsic.height;
        } else {
            CGFloat cellH = [[field cell] cellSizeForBounds:NSMakeRect(0, 0, availW, CGFLOAT_MAX)].height;
            int nlines = MAX(1, (int)floor(cellH / cssLH + 0.1));
            if (widthMode == YGMeasureModeUndefined) result.width = intrinsic.width;
            else if (widthMode == YGMeasureModeAtMost) result.width = MIN(intrinsic.width, width);
            else result.width = width;
            result.height = nlines * cssLH;
        }
    } else if ([view isKindOfClass:[NSScrollView class]]) {
        TSNShadowNode *shadow = tsn_shadow_node_for_obj(view);
        if (shadow && shadow.kind == TSNNodeKindScroll && shadow.contentYogaNode) {
            float calcWidth = YGUndefined;
            float calcHeight = YGUndefined;
            if (shadow.scrollAxis == 1) {
                if (heightMode != YGMeasureModeUndefined) calcHeight = height;
                YGNodeCalculateLayout(shadow.contentYogaNode, YGUndefined, calcHeight, YGDirectionLTR);
            } else {
                if (widthMode != YGMeasureModeUndefined) calcWidth = width;
                YGNodeCalculateLayout(shadow.contentYogaNode, calcWidth, YGUndefined, YGDirectionLTR);
            }

            CGFloat contentWidth = YGNodeLayoutGetWidth(shadow.contentYogaNode);
            CGFloat contentHeight = YGNodeLayoutGetHeight(shadow.contentYogaNode);

            if (widthMode == YGMeasureModeUndefined) result.width = contentWidth;
            else if (widthMode == YGMeasureModeAtMost) result.width = MIN(contentWidth, width);
            else result.width = width;

            if (heightMode == YGMeasureModeUndefined) result.height = contentHeight;
            else if (heightMode == YGMeasureModeAtMost) result.height = MIN(contentHeight, height);
            else result.height = height;
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

@implementation UIStackContainer
- (BOOL)isFlipped { return YES; }

- (void)layout {
    [super layout];
    TSNShadowNode *node = tsn_shadow_node_for_obj(self);
    if (!node || node.parent) return;
    NSRect bounds = self.bounds;
    if (bounds.size.width <= 0 || bounds.size.height <= 0) return;
    tsn_commit_root_layout(node, bounds.size);
}
@end

static YGNodeRef yoga_node_for_handle(UIHandle handle) {
    TSNShadowNode *node = tsn_shadow_node_for_handle(handle);
    return node ? node.yogaNode : NULL;
}

static NSView *view_for_handle(UIHandle handle) {
    return tsn_view_for_handle(handle);
}

/* ─── Layout Functions ──────────────────────────────────────────── */

UIHandle ui_vstack(void) {
    UIStackContainer *view = [UIStackContainer new];
    TSNShadowNode *node = tsn_create_container_node(view, TSNNodeKindVStack, 0);
    retain_render(view);
    return (__bridge UIHandle)view;
}

UIHandle ui_hstack(void) {
    UIStackContainer *view = [UIStackContainer new];
    TSNShadowNode *node = tsn_create_container_node(view, TSNNodeKindHStack, 1);
    retain_render(view);
    return (__bridge UIHandle)view;
}

UIHandle ui_zstack(void) {
    UIStackContainer *view = [UIStackContainer new];
    view.wantsLayer = YES;
    view.layer.masksToBounds = YES;
    TSNShadowNode *node = tsn_create_container_node(view, TSNNodeKindZStack, 2);
    retain_render(view);
    return (__bridge UIHandle)view;
}

void ui_set_aspect(UIHandle v, int w, int h) {
    NSView *view = view_for_handle(v);
    if (!view) return;
    NSValue *val = [NSValue valueWithSize:NSMakeSize(w, h)];
    objc_setAssociatedObject(view, &kAspectRatioKey, val, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    YGNodeRef node = yoga_node_for_handle(v);
    if (node) YGNodeStyleSetAspectRatio(node, (float)w / (float)h);
}

void ui_set_clip(UIHandle v, int clip) {
    NSView *view = view_for_handle(v);
    if (!view) return;
    view.wantsLayer = YES;
    view.layer.masksToBounds = (clip != 0);
}

void ui_set_gradient(UIHandle v, double r1, double g1, double b1, double a1,
                     double r2, double g2, double b2, double a2, int direction) {
    NSView *view = view_for_handle(v);
    if (!view) return;
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
    YGNodeRef node = yoga_node_for_handle(v);
    if (!node) return;
    YGNodeStyleSetPadding(node, YGEdgeTop, t);
    YGNodeStyleSetPadding(node, YGEdgeRight, r);
    YGNodeStyleSetPadding(node, YGEdgeBottom, b);
    YGNodeStyleSetPadding(node, YGEdgeLeft, l);
}

void ui_set_spacing(UIHandle v, int sp) {
    YGNodeRef node = yoga_node_for_handle(v);
    if (node) YGNodeStyleSetGap(node, YGGutterAll, sp);
}

void ui_set_flex(UIHandle v, int f) {
    YGNodeRef node = yoga_node_for_handle(v);
    if (!node) return;
    if (f > 0) {
        YGNodeStyleSetFlexGrow(node, (float)f);
        YGNodeStyleSetFlexShrink(node, 1);
        YGNodeStyleSetFlexBasis(node, 0);
        return;
    }
    YGNodeStyleSetFlexGrow(node, 0);
    YGNodeStyleSetFlexShrink(node, 0);
    YGNodeStyleSetFlexBasisAuto(node);
}

void ui_set_size(UIHandle v, int w, int h) {
    YGNodeRef node = yoga_node_for_handle(v);
    if (!node) return;
    if (w >= 0) YGNodeStyleSetWidth(node, w);
    if (h >= 0) YGNodeStyleSetHeight(node, h);
}

void ui_set_size_pct(UIHandle v, double w, double h) {
    YGNodeRef node = yoga_node_for_handle(v);
    if (!node) return;
    if (w >= 0) YGNodeStyleSetWidthPercent(node, w);
    if (h >= 0) YGNodeStyleSetHeightPercent(node, h);
}

void ui_set_min_size(UIHandle v, int w, int h) {
    YGNodeRef node = yoga_node_for_handle(v);
    if (!node) return;
    if (w >= 0) YGNodeStyleSetMinWidth(node, w);
    if (h >= 0) YGNodeStyleSetMinHeight(node, h);
}

void ui_set_min_size_pct(UIHandle v, double w, double h) {
    YGNodeRef node = yoga_node_for_handle(v);
    if (!node) return;
    if (w >= 0) YGNodeStyleSetMinWidthPercent(node, w);
    if (h >= 0) YGNodeStyleSetMinHeightPercent(node, h);
}

void ui_set_max_size(UIHandle v, int w, int h) {
    YGNodeRef node = yoga_node_for_handle(v);
    if (!node) return;
    if (w >= 0) YGNodeStyleSetMaxWidth(node, w);
    if (h >= 0) YGNodeStyleSetMaxHeight(node, h);
}

void ui_set_max_size_pct(UIHandle v, double w, double h) {
    YGNodeRef node = yoga_node_for_handle(v);
    if (!node) return;
    if (w >= 0) YGNodeStyleSetMaxWidthPercent(node, w);
    if (h >= 0) YGNodeStyleSetMaxHeightPercent(node, h);
}

void ui_set_alignment(UIHandle v, int a) {
    YGNodeRef node = yoga_node_for_handle(v);
    if (!node) return;
    YGAlign align = YGAlignAuto;
    if (a == 1) align = YGAlignCenter;
    else if (a == 2) align = YGAlignFlexEnd;
    YGNodeStyleSetAlignSelf(node, align);
}

void ui_set_margin_auto(UIHandle v) {
    YGNodeRef node = yoga_node_for_handle(v);
    if (!node) return;
    YGNodeStyleSetWidthPercent(node, 100);
    YGNodeStyleSetMarginAuto(node, YGEdgeLeft);
    YGNodeStyleSetMarginAuto(node, YGEdgeRight);
}

void ui_set_align_items(UIHandle v, int a) {
    YGNodeRef node = yoga_node_for_handle(v);
    if (!node) return;
    YGAlign align = YGAlignStretch;
    if (a == 0) align = YGAlignFlexStart;
    else if (a == 1) align = YGAlignCenter;
    else if (a == 2) align = YGAlignFlexEnd;
    YGNodeStyleSetAlignItems(node, align);
}

void ui_set_justify_content(UIHandle v, int j) {
    YGNodeRef node = yoga_node_for_handle(v);
    if (!node) return;
    YGJustify justify = YGJustifyFlexStart;
    if (j == 1) justify = YGJustifyCenter;
    else if (j == 2) justify = YGJustifyFlexEnd;
    else if (j == 3) justify = YGJustifySpaceBetween;
    YGNodeStyleSetJustifyContent(node, justify);
}

void ui_add_child(UIHandle parent, UIHandle child) {
    TSNShadowNode *parentNode = tsn_shadow_node_for_handle(parent);
    TSNShadowNode *childNode = tsn_shadow_node_for_handle(child);
    if (!parentNode || !childNode) return;
    tsn_attach_child_nodes(parentNode, childNode);
}

UIHandle ui_spacer(void) {
    UISpacer *view = [UISpacer new];
    TSNShadowNode *node = tsn_create_view_node(view, TSNNodeKindLeaf, 0, NO);
    YGNodeStyleSetFlexGrow(node.yogaNode, 1);
    retain_render(view);
    return (__bridge UIHandle)view;
}

UIHandle ui_divider(void) {
    NSBox *box = [NSBox new];
    box.boxType = NSBoxSeparator;
    tsn_create_view_node(box, TSNNodeKindLeaf, 0, YES);
    retain_render(box);
    return (__bridge UIHandle)box;
}

/* ─── Blur View ──────────────────────────────────────────────────── */

UIHandle ui_blur_view(int material) {
    NSVisualEffectView *view = [NSVisualEffectView new];
    switch (material) {
        case 0: view.material = NSVisualEffectMaterialSidebar; break;
        case 1: view.material = NSVisualEffectMaterialHeaderView; break;
        case 2: view.material = NSVisualEffectMaterialContentBackground; break;
        case 3: view.material = NSVisualEffectMaterialSheet; break;
        default: view.material = NSVisualEffectMaterialContentBackground; break;
    }
    view.blendingMode = NSVisualEffectBlendingModeBehindWindow;
    tsn_create_view_node(view, TSNNodeKindVStack, 0, NO);
    retain_render(view);
    return (__bridge UIHandle)view;
}
