/* ─── Sidebar ────────────────────────────────────────────────────── */
UIHandle ui_sidebar(int width) {
    NSVisualEffectView *vev = [NSVisualEffectView new];
    vev.material = NSVisualEffectMaterialSidebar;
    vev.blendingMode = NSVisualEffectBlendingModeBehindWindow;

    UIStackContainer *s = [UIStackContainer new];
    s.direction = 0;
    s.fixed_width = width;
    s.spacing = 2;
    s.padding_top = 8; s.padding_left = 8; s.padding_right = 8;
    [vev addSubview:s];
    s.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;

    retain_render(vev);
    retain_render(s);
    return (__bridge UIHandle)vev;
}

UIHandle ui_sidebar_section(UIHandle sidebar, const char *header) {
    NSView *vev = (__bridge NSView *)sidebar;
    UIStackContainer *s = nil;
    for (NSView *sub in vev.subviews) {
        if ([sub isKindOfClass:[UIStackContainer class]]) { s = (UIStackContainer *)sub; break; }
    }
    if (!s) return sidebar;

    NSTextField *h = [NSTextField labelWithString:[NSString stringWithUTF8String:header]];
    h.font = [NSFont systemFontOfSize:10 weight:NSFontWeightBold];
    h.textColor = [NSColor colorWithWhite:0.45 alpha:1];
    [s.children addObject:h];
    [s addSubview:h];

    return sidebar;
}

UIHandle ui_sidebar_item(UIHandle section, const char *label, const char *sf_symbol,
                         int tag, UIClickFn fn) {
    NSView *vev = (__bridge NSView *)section;
    UIStackContainer *s = nil;
    for (NSView *sub in vev.subviews) {
        if ([sub isKindOfClass:[UIStackContainer class]]) { s = (UIStackContainer *)sub; break; }
    }
    if (!s) return section;

    UIHandle btn;
    if (sf_symbol && strlen(sf_symbol) > 0) {
        btn = ui_button_icon(sf_symbol, label, fn, tag);
    } else {
        btn = ui_button(label, fn, tag);
    }

    NSButton *b = (__bridge NSButton *)btn;
    b.alignment = NSTextAlignmentLeft;
    [s.children addObject:b];
    [s addSubview:b];

    return btn;
}

void ui_sidebar_item_set_badge(UIHandle item, const char *badge) {
    /* TODO: add badge view next to the button */
}

/* ─── Scroll View ────────────────────────────────────────────────── */
UIHandle ui_scroll(void) {
    NSScrollView *sv = [NSScrollView new];
    sv.hasVerticalScroller = YES;
    sv.hasHorizontalScroller = NO;
    sv.drawsBackground = NO;
    retain_render(sv);
    return (__bridge UIHandle)sv;
}

void ui_scroll_set_axis(UIHandle s, int axis) {
    NSScrollView *sv = (__bridge NSScrollView *)s;
    if (![sv isKindOfClass:[NSScrollView class]]) return;
    if (axis == 1) {
        sv.hasHorizontalScroller = YES;
        sv.hasVerticalScroller = NO;
    } else {
        sv.hasHorizontalScroller = NO;
        sv.hasVerticalScroller = YES;
    }
}

/* ─── Tab View ───────────────────────────────────────────────────── */
UIHandle ui_tab_view(void) { return ui_vstack(); /* placeholder */ }
UIHandle ui_tab(UIHandle tv, const char *l, const char *s) { return ui_vstack(); }

/* ─── Popover ────────────────────────────────────────────────────── */
void ui_show_popover(UIHandle anchor, UIHandle content, int w, int h) { /* TODO */ }
