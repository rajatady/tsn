/* ─── Sidebar ────────────────────────────────────────────────────── */
UIHandle ui_sidebar(int width) {
    NSVisualEffectView *vev = [NSVisualEffectView new];
    vev.material = NSVisualEffectMaterialSidebar;
    vev.blendingMode = NSVisualEffectBlendingModeBehindWindow;
    TSNShadowNode *node = tsn_create_view_node(vev, TSNNodeKindVStack, 0, NO);
    YGNodeStyleSetWidth(node.yogaNode, width);
    YGNodeStyleSetGap(node.yogaNode, YGGutterAll, 2);
    YGNodeStyleSetPadding(node.yogaNode, YGEdgeTop, 8);
    YGNodeStyleSetPadding(node.yogaNode, YGEdgeLeft, 8);
    YGNodeStyleSetPadding(node.yogaNode, YGEdgeRight, 8);

    retain_render(vev);
    return (__bridge UIHandle)vev;
}

UIHandle ui_sidebar_section(UIHandle sidebar, const char *header) {
    UIHandle textHandle = ui_text(header, 10, true);
    NSTextField *h = (__bridge NSTextField *)textHandle;
    h.font = [NSFont systemFontOfSize:10 weight:NSFontWeightBold];
    h.textColor = [NSColor colorWithWhite:0.45 alpha:1];
    ui_add_child(sidebar, textHandle);
    return sidebar;
}

UIHandle ui_sidebar_item(UIHandle section, const char *label, const char *sf_symbol,
                         int tag, UIClickFn fn) {
    UIHandle btn;
    if (sf_symbol && strlen(sf_symbol) > 0) {
        btn = ui_button_icon(sf_symbol, label, fn, tag);
    } else {
        btn = ui_button(label, fn, tag);
    }

    NSButton *b = (__bridge NSButton *)btn;
    b.alignment = NSTextAlignmentLeft;
    ui_add_child(section, btn);
    return btn;
}

void ui_sidebar_item_set_badge(UIHandle item, const char *badge) {
    /* TODO: add badge view next to the button */
}

/* ─── Scroll View subclass (forwards vertical events when horizontal-only) */

@interface UIScrollViewForwarding : NSScrollView
@end

@implementation UIScrollViewForwarding

- (void)scrollWheel:(NSEvent *)event {
    /* Only intercept when configured as horizontal-only */
    if (!self.hasHorizontalScroller || self.hasVerticalScroller) {
        [super scrollWheel:event];
        return;
    }

    /* If the scroll is predominantly vertical, forward to the nearest
       ancestor vertical scroll view instead of swallowing it. */
    if (fabs(event.scrollingDeltaY) > fabs(event.scrollingDeltaX)) {
        NSView *ancestor = self.superview;
        while (ancestor) {
            if ([ancestor isKindOfClass:[NSScrollView class]]) {
                NSScrollView *parentSV = (NSScrollView *)ancestor;
                if (parentSV.hasVerticalScroller) {
                    [parentSV scrollWheel:event];
                    return;
                }
            }
            ancestor = ancestor.superview;
        }
    }

    [super scrollWheel:event];
}

@end

/* ─── Scroll View ────────────────────────────────────────────────── */
UIHandle ui_scroll(void) {
    UIScrollViewForwarding *sv = [UIScrollViewForwarding new];
    sv.hasVerticalScroller = YES;
    sv.hasHorizontalScroller = NO;
    sv.drawsBackground = NO;
    tsn_create_scroll_node(sv);
    retain_render(sv);
    return (__bridge UIHandle)sv;
}

void ui_scroll_set_axis(UIHandle s, int axis) {
    NSScrollView *sv = (__bridge NSScrollView *)s;
    if (![sv isKindOfClass:[NSScrollView class]]) return;
    TSNShadowNode *node = tsn_shadow_node_for_obj(sv);
    TSNPendingLayoutStyle *style = tsn_current_layout_style(sv, YES);
    style->hasScrollAxis = YES;
    style->scrollAxis = axis;
    if (!tsn_is_recording_responsive_variant(sv) && node) tsn_apply_layout_style(node, style);
}

/* ─── Tab View ───────────────────────────────────────────────────── */
UIHandle ui_tab_view(void) { return ui_vstack(); /* placeholder */ }
UIHandle ui_tab(UIHandle tv, const char *l, const char *s) { return ui_vstack(); }

/* ─── Popover ────────────────────────────────────────────────────── */
void ui_show_popover(UIHandle anchor, UIHandle content, int w, int h) { /* TODO */ }
