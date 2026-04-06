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

/* ─── Stack Layout View ──────────────────────────────────────────── */

@interface UIStackContainer : NSView
@property int direction;  /* 0=V, 1=H */
@property int padding_top, padding_right, padding_bottom, padding_left;
@property int spacing;
@property int flex;
@property int fixed_width, fixed_height;
@property int min_width, min_height;
@property int max_width, max_height;
@property int alignment;        /* per-child self-alignment: 0=default, 1=center, 2=end */
@property int align_items;      /* container cross-axis: 0=start, 1=center, 2=end, 3=stretch(default) */
@property int justify_content;  /* container main-axis: 0=start, 1=center, 2=end, 3=space-between */
@property (nonatomic, strong) NSMutableArray<NSView *> *children;
@end

static CGFloat clamp_dimension(CGFloat value, int min_value, int max_value) {
    if (min_value >= 0 && value < min_value) value = min_value;
    if (max_value >= 0 && value > max_value) value = max_value;
    return value;
}

static NSSize apply_stack_constraints(UIStackContainer *stack, NSSize size) {
    size.width = clamp_dimension(size.width, stack.min_width, stack.max_width);
    size.height = clamp_dimension(size.height, stack.min_height, stack.max_height);
    return size;
}

static CGFloat child_cross_origin(CGFloat base, CGFloat available, CGFloat size, int alignment) {
    if (alignment == 1 && size < available) return base + floor((available - size) * 0.5);
    if (alignment == 2 && size < available) return base + (available - size);
    return base;
}

@implementation UIStackContainer
- (instancetype)init {
    self = [super init];
    _children = [NSMutableArray new];
    _spacing = 8;
    _fixed_width = -1;
    _fixed_height = -1;
    _min_width = -1;
    _min_height = -1;
    _max_width = -1;
    _max_height = -1;
    _alignment = 0;
    _align_items = 3;      /* stretch by default */
    _justify_content = 0;  /* start by default */
    return self;
}
- (BOOL)isFlipped { return YES; }

/* Compute the natural (content-derived) size of this stack */
- (NSSize)naturalSize {
    CGFloat w = _padding_left + _padding_right;
    CGFloat h = _padding_top + _padding_bottom;
    CGFloat spacing_total = (_children.count > 1) ? (_children.count - 1) * _spacing : 0;

    for (NSView *child in _children) {
        CGFloat cw = 0, ch = 0;
        if ([child isKindOfClass:[UIStackContainer class]]) {
            UIStackContainer *sc = (UIStackContainer *)child;
            if (sc.fixed_width > 0) cw = sc.fixed_width;
            else { NSSize ns = [sc naturalSize]; cw = ns.width; }
            if (sc.fixed_height > 0) ch = sc.fixed_height;
            else { NSSize ns = [sc naturalSize]; ch = ns.height; }
        } else if ([child isKindOfClass:[UISpacer class]]) {
            /* spacers contribute nothing to natural size */
        } else {
            NSSize intrinsic = child.intrinsicContentSize;
            CGFloat fw = child.frame.size.width, fh = child.frame.size.height;
            cw = intrinsic.width > 0 ? intrinsic.width : (fw > 0 ? fw : 0);
            ch = intrinsic.height > 0 ? intrinsic.height : (fh > 0 ? fh : 0);
        }

        if (_direction == 2) {
            /* ZStack: max of all children */
            if (cw > w - _padding_left - _padding_right) w = cw + _padding_left + _padding_right;
            if (ch > h - _padding_top - _padding_bottom) h = ch + _padding_top + _padding_bottom;
        } else if (_direction == 0) {
            if (cw > w - _padding_left - _padding_right) w = cw + _padding_left + _padding_right;
            h += ch;
        } else {
            w += cw;
            if (ch > h - _padding_top - _padding_bottom) h = ch + _padding_top + _padding_bottom;
        }
    }

    if (_direction == 0) h += spacing_total;
    else if (_direction == 1) w += spacing_total;

    return apply_stack_constraints(self, NSMakeSize(w, h));
}

/* Compute height assuming a given available width.
   Unlike naturalSize, this accounts for flex distribution and aspect ratios.
   Used by parent VStacks to correctly size HStack/ZStack children. */
- (CGFloat)heightForWidth:(CGFloat)width {
    CGFloat inner_w = width - _padding_left - _padding_right;
    if (inner_w <= 0) return [self naturalSize].height;

    /* ZStack: height from first child with aspect ratio */
    if (_direction == 2) {
        for (NSView *child in _children) {
            CGFloat ah = aspect_height(child, inner_w);
            if (ah >= 0) return ah + _padding_top + _padding_bottom;
        }
        return [self naturalSize].height;
    }

    /* VStack: sum children heights using width-aware computation */
    if (_direction == 0) {
        CGFloat h = _padding_top + _padding_bottom;
        CGFloat sp = (_children.count > 1) ? (_children.count - 1) * _spacing : 0;
        h += sp;
        for (NSView *child in _children) {
            if ([child isKindOfClass:[UIStackContainer class]]) {
                UIStackContainer *sc = (UIStackContainer *)child;
                if (sc.flex > 0) continue;
                if (sc.fixed_height > 0) { h += sc.fixed_height; continue; }
                CGFloat ch2 = [sc heightForWidth:inner_w];
                h += ch2;
            } else if ([child isKindOfClass:[UISpacer class]]) {
                /* skip */
            } else {
                CGFloat ah = aspect_height(child, inner_w);
                if (ah >= 0) { h += ah; continue; }
                if ([child isKindOfClass:[NSTextField class]]) {
                    NSTextField *field = (NSTextField *)child;
                    CGFloat fs = field.font.pointSize;
                    CGFloat cssLH = fs * 1.5;
                    CGFloat cellH = [[field cell] cellSizeForBounds:NSMakeRect(0, 0, inner_w, CGFLOAT_MAX)].height;
                    int nlines = MAX(1, (int)floor(cellH / cssLH + 0.1));
                    h += nlines * cssLH;
                } else {
                    CGFloat fh = child.frame.size.height;
                    NSSize intrinsic = child.intrinsicContentSize;
                    h += (fh > 0) ? fh : (intrinsic.height > 0 ? intrinsic.height : 24);
                }
            }
        }
        return apply_stack_constraints(self, NSMakeSize(width, h)).height;
    }

    /* HStack: distribute width among children, return max height */
    int nflex = 0;
    CGFloat fixed_w = 0;
    CGFloat sp = (_children.count > 1) ? (_children.count - 1) * _spacing : 0;
    for (NSView *child in _children) {
        if ([child isKindOfClass:[UIStackContainer class]]) {
            UIStackContainer *sc = (UIStackContainer *)child;
            if (sc.flex > 0) nflex += sc.flex;
            else if (sc.fixed_width > 0) fixed_w += sc.fixed_width;
            else fixed_w += [sc naturalSize].width;
        } else if ([child isKindOfClass:[UISpacer class]]) {
            /* skip */
        } else {
            CGFloat fw = child.frame.size.width;
            NSSize intrinsic = child.intrinsicContentSize;
            fixed_w += (fw > 0) ? fw : (intrinsic.width > 0 ? intrinsic.width : 60);
        }
    }
    CGFloat flex_space = inner_w - fixed_w - sp;
    if (flex_space < 0) flex_space = 0;

    CGFloat max_h = 0;
    for (NSView *child in _children) {
        CGFloat child_h = 0;
        if ([child isKindOfClass:[UIStackContainer class]]) {
            UIStackContainer *sc = (UIStackContainer *)child;
            if (sc.fixed_height > 0) { child_h = sc.fixed_height; }
            else {
                CGFloat child_w;
                if (sc.flex > 0 && nflex > 0) child_w = flex_space * sc.flex / nflex;
                else if (sc.fixed_width > 0) child_w = sc.fixed_width;
                else child_w = [sc naturalSize].width;
                child_h = [sc heightForWidth:child_w];
            }
        } else if ([child isKindOfClass:[UISpacer class]]) {
            /* skip */
        } else {
            CGFloat fh = child.frame.size.height;
            NSSize intrinsic = child.intrinsicContentSize;
            child_h = (fh > 0) ? fh : (intrinsic.height > 0 ? intrinsic.height : 24);
        }
        if (child_h > max_h) max_h = child_h;
    }
    CGFloat h = max_h + _padding_top + _padding_bottom;
    return apply_stack_constraints(self, NSMakeSize(width, h)).height;
}

- (void)layout {
    [super layout];
    NSRect b = self.bounds;
    CGFloat x = _padding_left;
    CGFloat y = _padding_top;
    CGFloat avail_w = b.size.width - _padding_left - _padding_right;
    CGFloat avail_h = b.size.height - _padding_top - _padding_bottom;

    /* ZStack: all children fill the container, layered on top of each other.
       The first child with an aspect ratio determines the container height. */
    if (_direction == 2) {
        /* First pass: find if any child has an aspect ratio that should set our height */
        CGFloat zstack_h = avail_h;
        for (NSView *child in _children) {
            CGFloat ah = aspect_height(child, avail_w);
            if (ah >= 0) { zstack_h = ah; break; }
        }
        for (NSView *child in _children) {
            CGFloat cw = avail_w, ch = zstack_h;
            /* Apply per-child aspect ratio */
            CGFloat ah = aspect_height(child, cw);
            if (ah >= 0) ch = ah;
            child.frame = NSMakeRect(x, y, cw, ch);
            if ([child isKindOfClass:[UIStackContainer class]]) {
                [(UIStackContainer *)child layout];
            }
        }
        return;
    }

    /* Count flex children and fixed sizes */
    int nflex = 0;
    CGFloat fixed_total = 0;
    for (NSView *child in _children) {
        if ([child isKindOfClass:[UIStackContainer class]]) {
            UIStackContainer *sc = (UIStackContainer *)child;
            if (sc.flex > 0) { nflex += sc.flex; }
            else if (_direction == 0 && sc.fixed_height > 0) fixed_total += sc.fixed_height;
            else if (_direction == 1 && sc.fixed_width > 0) fixed_total += sc.fixed_width;
            else {
                /* No fixed size, no flex — use width-aware height for VStack parents */
                if (_direction == 0) {
                    fixed_total += [sc heightForWidth:avail_w];
                } else {
                    NSSize ns = apply_stack_constraints(sc, [sc naturalSize]);
                    fixed_total += ns.width;
                }
            }
        } else if ([child isKindOfClass:[NSVisualEffectView class]]) {
            UIStackContainer *inner = nil;
            for (NSView *sub in child.subviews) {
                if ([sub isKindOfClass:[UIStackContainer class]]) { inner = (UIStackContainer *)sub; break; }
            }
            if (inner && inner.flex > 0) nflex += inner.flex;
            else if (inner) {
                if (_direction == 0 && inner.fixed_height > 0) fixed_total += inner.fixed_height;
                else if (_direction == 1 && inner.fixed_width > 0) fixed_total += inner.fixed_width;
                else fixed_total += 100;
            } else fixed_total += 100;
        } else if ([child isKindOfClass:[UISpacer class]]) {
            /* Spacers absorb remaining space — don't count as fixed */
        } else if ([child isKindOfClass:[NSScrollView class]]) {
            CGFloat fw = child.frame.size.width, fh = child.frame.size.height;
            if (_direction == 0 && fh > 0) fixed_total += fh;
            else if (_direction == 1 && fw > 0) fixed_total += fw;
        } else {
            /* Check aspect ratio first */
            CGFloat ah = aspect_height(child, _direction == 0 ? avail_w : 0);
            if (ah >= 0 && _direction == 0) {
                fixed_total += ah;
            } else if ([child isKindOfClass:[NSTextField class]] && _direction == 0) {
                NSTextField *field = (NSTextField *)child;
                CGFloat fs = field.font.pointSize;
                CGFloat cssLH = fs * 1.5;
                CGFloat cellH = [[field cell] cellSizeForBounds:NSMakeRect(0, 0, avail_w, CGFLOAT_MAX)].height;
                int nlines = MAX(1, (int)floor(cellH / cssLH + 0.1));
                fixed_total += nlines * cssLH;
            } else {
                NSSize intrinsic = child.intrinsicContentSize;
                CGFloat fw = child.frame.size.width, fh = child.frame.size.height;
                if (_direction == 0) fixed_total += (fh > 0 ? fh : (intrinsic.height > 0 ? intrinsic.height : 24));
                else fixed_total += (fw > 0 ? fw : (intrinsic.width > 0 ? intrinsic.width : 60));
            }
        }
    }
    CGFloat spacing_total = (_children.count > 1) ? (_children.count - 1) * _spacing : 0;
    CGFloat flex_space = (_direction == 0 ? avail_h : avail_w) - fixed_total - spacing_total;
    if (flex_space < 0) flex_space = 0;

    /* justify-content: compute main-axis offset and adjusted spacing */
    CGFloat justify_offset = 0;
    CGFloat justify_spacing = _spacing;
    if (_justify_content > 0) {
        CGFloat total_main = fixed_total + spacing_total;
        CGFloat main_avail = (_direction == 0) ? avail_h : avail_w;
        CGFloat remaining = main_avail - total_main;
        if (remaining > 0) {
            if (_justify_content == 1) justify_offset = remaining * 0.5;        /* center */
            else if (_justify_content == 2) justify_offset = remaining;          /* end */
            else if (_justify_content == 3 && _children.count > 1) {             /* space-between */
                justify_spacing = _spacing + remaining / (_children.count - 1);
            }
        }
    }
    if (_direction == 0) y += justify_offset;
    else x += justify_offset;

    for (NSView *child in _children) {
        CGFloat cw, ch;
        int child_flex = 0;

        if ([child isKindOfClass:[UIStackContainer class]]) {
            UIStackContainer *sc = (UIStackContainer *)child;
            child_flex = sc.flex;
            if (_direction == 1) {
                cw = (sc.fixed_width > 0) ? sc.fixed_width : (sc.flex > 0 ? 0 : [sc naturalSize].width);
                /* Cross-axis: use natural height when align_items is not stretch */
                if (sc.fixed_height > 0) ch = sc.fixed_height;
                else if (_align_items != 3 && sc.flex == 0) {
                    CGFloat nh = [sc naturalSize].height;
                    ch = (nh > 0) ? nh : avail_h;
                } else ch = avail_h;
            } else {
                /* Cross-axis: use natural width when align_items is not stretch */
                if (sc.fixed_width > 0) cw = sc.fixed_width;
                else if (_align_items != 3 && sc.flex == 0) {
                    CGFloat nw = [sc naturalSize].width;
                    cw = (nw > 0) ? nw : avail_w;
                } else cw = avail_w;
                ch = (sc.fixed_height > 0) ? sc.fixed_height : (sc.flex > 0 ? 0 : [sc heightForWidth:cw]);
            }
            cw = clamp_dimension(cw, sc.min_width, sc.max_width);
            ch = clamp_dimension(ch, sc.min_height, sc.max_height);
        } else if ([child isKindOfClass:[NSScrollView class]]) {
            CGFloat fw = child.frame.size.width;
            CGFloat fh = child.frame.size.height;
            cw = (fw > 0) ? fw : avail_w;
            ch = (fh > 0) ? fh : avail_h;
        } else {
            NSSize intrinsic = child.intrinsicContentSize;
            CGFloat frameW = child.frame.size.width;
            CGFloat frameH = child.frame.size.height;
            /* Explicit frame sizes from Tailwind should win over intrinsic content size. */
            if ([child isKindOfClass:[NSTextField class]]) {
                NSTextField *field = (NSTextField *)child;
                if (_direction == 1) {
                    cw = (frameW > 0) ? frameW : (intrinsic.width > 0 ? intrinsic.width : 60);
                    ch = (frameH > 0) ? frameH : [[field cell] cellSizeForBounds:NSMakeRect(0, 0, cw, CGFLOAT_MAX)].height;
                } else {
                    /* VStack: text fills available width like CSS block elements */
                    cw = avail_w;
                    CGFloat fs = field.font.pointSize;
                    CGFloat cssLH = fs * 1.5;
                    CGFloat cellH = [[field cell] cellSizeForBounds:NSMakeRect(0, 0, cw, CGFLOAT_MAX)].height;
                    int nlines = MAX(1, (int)floor(cellH / cssLH + 0.1));
                    ch = nlines * cssLH;
                }
            } else if (_direction == 1) {
                cw = (frameW > 0) ? frameW : (intrinsic.width > 0 ? intrinsic.width : 60);
                ch = (frameH > 0) ? frameH : avail_h;
            } else {
                cw = (frameW > 0) ? frameW : avail_w;
                ch = (frameH > 0) ? frameH : (intrinsic.height > 0 ? intrinsic.height : 24);
            }
        }

        /* Aspect ratio: if set, override height based on computed width */
        CGFloat ah = aspect_height(child, cw);
        if (ah >= 0) ch = ah;

        if (child_flex > 0 && nflex > 0) {
            CGFloat portion = flex_space * child_flex / nflex;
            if (_direction == 0) ch = portion;
            else {
                cw = portion;
                /* Cross-axis: recompute height for flex children with non-stretch alignment */
                if (_align_items != 3 && [child isKindOfClass:[UIStackContainer class]]) {
                    UIStackContainer *fsc = (UIStackContainer *)child;
                    CGFloat fh = [fsc heightForWidth:cw];
                    if (fh > 0) ch = fh;
                }
            }
            if ([child isKindOfClass:[UIStackContainer class]]) {
                UIStackContainer *sc = (UIStackContainer *)child;
                cw = clamp_dimension(cw, sc.min_width, sc.max_width);
                ch = clamp_dimension(ch, sc.min_height, sc.max_height);
            }
        }

        /* Spacer: takes remaining flex */
        if ([child isKindOfClass:[UISpacer class]]) {
            if (_direction == 0) ch = (nflex > 0) ? 0 : flex_space;
            else cw = (nflex > 0) ? 0 : flex_space;
        }

        /* Handle blur views wrapping stacks */
        if ([child isKindOfClass:[NSVisualEffectView class]]) {
            for (NSView *sub in child.subviews) {
                if ([sub isKindOfClass:[UIStackContainer class]]) {
                    UIStackContainer *inner = (UIStackContainer *)sub;
                    if (inner.flex > 0 && nflex > 0) {
                        CGFloat portion = flex_space * inner.flex / nflex;
                        if (_direction == 0) ch = portion; else cw = portion;
                    }
                    if (inner.fixed_width > 0 && _direction == 1) cw = inner.fixed_width;
                    if (inner.fixed_height > 0 && _direction == 0) ch = inner.fixed_height;
                }
            }
        }

        CGFloat child_x = x;
        CGFloat child_y = y;
        {
            /* Resolve cross-axis alignment: child self-alignment wins, then container align_items */
            int cross_align = 0;
            if ([child isKindOfClass:[UIStackContainer class]]) {
                UIStackContainer *sc = (UIStackContainer *)child;
                cross_align = sc.alignment;  /* per-child override */
            }
            /* Fall back to container align_items if child has no self-alignment */
            if (cross_align == 0 && _align_items != 3) {
                cross_align = _align_items;  /* 0=start, 1=center, 2=end */
            }
            if (cross_align > 0) {
                if (_direction == 0) child_x = child_cross_origin(_padding_left, avail_w, cw, cross_align);
                else child_y = child_cross_origin(_padding_top, avail_h, ch, cross_align);
            }
        }

        child.frame = NSMakeRect(child_x, child_y, cw, ch);
        /* Fill inner content of blur/scroll views only — don't clobber nested stack layouts */
        if ([child isKindOfClass:[NSVisualEffectView class]] ||
            [child isKindOfClass:[NSScrollView class]]) {
            for (NSView *sub in child.subviews) sub.frame = child.bounds;
            if ([child isKindOfClass:[NSScrollView class]]) {
                NSScrollView *sv = (NSScrollView *)child;
                NSView *doc = sv.documentView;
                if ([doc isKindOfClass:[UIStackContainer class]]) {
                    UIStackContainer *stack = (UIStackContainer *)doc;
                    BOOL horizontal = sv.hasHorizontalScroller && !sv.hasVerticalScroller;
                    NSSize natural = [stack naturalSize];
                    if (horizontal) {
                        stack.fixed_height = ch;
                        doc.frame = NSMakeRect(0, 0, natural.width > 0 ? natural.width : cw, ch);
                    } else {
                        stack.fixed_width = cw;
                        CGFloat doc_h = [stack heightForWidth:cw];
                        doc.frame = NSMakeRect(0, 0, cw, doc_h > 0 ? doc_h : ch);
                    }
                }
            }
        }

        if (_direction == 0) y += ch + justify_spacing;
        else x += cw + justify_spacing;
    }
}
@end

/* ─── Layout ─────────────────────────────────────────────────────── */

UIHandle ui_vstack(void) {
    UIStackContainer *s = [UIStackContainer new];
    s.direction = 0;
    retain_render(s);
    return (__bridge UIHandle)s;
}

UIHandle ui_hstack(void) {
    UIStackContainer *s = [UIStackContainer new];
    s.direction = 1;
    retain_render(s);
    return (__bridge UIHandle)s;
}

UIHandle ui_zstack(void) {
    UIStackContainer *s = [UIStackContainer new];
    s.direction = 2;
    s.wantsLayer = YES;
    s.layer.masksToBounds = YES;
    retain_render(s);
    return (__bridge UIHandle)s;
}

void ui_set_aspect(UIHandle v, int w, int h) {
    NSView *view = (__bridge NSView *)v;
    NSValue *val = [NSValue valueWithSize:NSMakeSize(w, h)];
    objc_setAssociatedObject(view, &kAspectRatioKey, val, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
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
    /* direction: 0=to-top, 1=to-bottom, 2=to-left, 3=to-right */
    if (direction == 0) { gl.startPoint = CGPointMake(0.5, 1); gl.endPoint = CGPointMake(0.5, 0); }
    else if (direction == 1) { gl.startPoint = CGPointMake(0.5, 0); gl.endPoint = CGPointMake(0.5, 1); }
    else if (direction == 2) { gl.startPoint = CGPointMake(1, 0.5); gl.endPoint = CGPointMake(0, 0.5); }
    else { gl.startPoint = CGPointMake(0, 0.5); gl.endPoint = CGPointMake(1, 0.5); }
    gl.frame = view.bounds;
    gl.autoresizingMask = kCALayerWidthSizable | kCALayerHeightSizable;
    [view.layer addSublayer:gl];
}

void ui_set_padding(UIHandle v, int t, int r, int b, int l) {
    UIStackContainer *s = (__bridge UIStackContainer *)v;
    if ([s isKindOfClass:[UIStackContainer class]]) {
        s.padding_top = t; s.padding_right = r; s.padding_bottom = b; s.padding_left = l;
    }
}

void ui_set_spacing(UIHandle v, int sp) {
    if ([(__bridge NSView *)v isKindOfClass:[UIStackContainer class]])
        ((UIStackContainer *)(__bridge NSView *)v).spacing = sp;
}

void ui_set_flex(UIHandle v, int f) {
    if ([(__bridge NSView *)v isKindOfClass:[UIStackContainer class]])
        ((UIStackContainer *)(__bridge NSView *)v).flex = f;
}

void ui_set_size(UIHandle v, int w, int h) {
    NSView *view = (__bridge NSView *)v;
    if ([view isKindOfClass:[UIStackContainer class]]) {
        UIStackContainer *s = (UIStackContainer *)view;
        s.fixed_width = w; s.fixed_height = h;
        return;
    }
    NSRect frame = view.frame;
    if (w >= 0) frame.size.width = w;
    if (h >= 0) frame.size.height = h;
    view.frame = frame;
}

void ui_set_min_size(UIHandle v, int w, int h) {
    NSView *view = (__bridge NSView *)v;
    if ([view isKindOfClass:[UIStackContainer class]]) {
        UIStackContainer *s = (UIStackContainer *)view;
        s.min_width = w;
        s.min_height = h;
    }
}

void ui_set_max_size(UIHandle v, int w, int h) {
    NSView *view = (__bridge NSView *)v;
    if ([view isKindOfClass:[UIStackContainer class]]) {
        UIStackContainer *s = (UIStackContainer *)view;
        s.max_width = w;
        s.max_height = h;
    }
}

void ui_set_alignment(UIHandle v, int a) {
    NSView *view = (__bridge NSView *)v;
    if ([view isKindOfClass:[UIStackContainer class]]) {
        ((UIStackContainer *)view).alignment = a;
    }
}

void ui_set_align_items(UIHandle v, int a) {
    NSView *view = (__bridge NSView *)v;
    if ([view isKindOfClass:[UIStackContainer class]]) {
        ((UIStackContainer *)view).align_items = a;
    }
}

void ui_set_justify_content(UIHandle v, int j) {
    NSView *view = (__bridge NSView *)v;
    if ([view isKindOfClass:[UIStackContainer class]]) {
        ((UIStackContainer *)view).justify_content = j;
    }
}

void ui_add_child(UIHandle parent, UIHandle child) {
    NSView *p = (__bridge NSView *)parent;
    NSView *c = (__bridge NSView *)child;

    if ([p isKindOfClass:[NSWindow class]]) {
        p = ((NSWindow *)p).contentView;
    }

    if ([p isKindOfClass:[UIStackContainer class]]) {
        [((UIStackContainer *)p).children addObject:c];
        [p addSubview:c];
    } else if ([p isKindOfClass:[NSScrollView class]]) {
        NSScrollView *sv = (NSScrollView *)p;
        sv.documentView = c;
        if ([c isKindOfClass:[UIStackContainer class]]) {
            UIStackContainer *stack = (UIStackContainer *)c;
            NSSize natural = [stack naturalSize];
            CGFloat width = sv.contentView.bounds.size.width > 0 ? sv.contentView.bounds.size.width : natural.width;
            CGFloat height = natural.height > 0 ? natural.height : sv.contentView.bounds.size.height;
            BOOL horizontal = sv.hasHorizontalScroller && !sv.hasVerticalScroller;
            if (horizontal) {
                if (sv.contentView.bounds.size.height > 0) stack.fixed_height = sv.contentView.bounds.size.height;
                c.frame = NSMakeRect(0, 0, natural.width > 0 ? natural.width : width, sv.contentView.bounds.size.height > 0 ? sv.contentView.bounds.size.height : height);
                c.autoresizingMask = NSViewHeightSizable;
            } else {
                stack.fixed_width = width;
                c.frame = NSMakeRect(0, 0, width, height);
                c.autoresizingMask = NSViewWidthSizable;
            }
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
