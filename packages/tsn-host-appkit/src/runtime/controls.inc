/* ─── SF Symbols ─────────────────────────────────────────────────── */

@interface TSNTextAreaView : NSTextView
@end

@implementation TSNTextAreaView
@end

@interface TSNButtonView : NSButton
@property (nonatomic, strong) NSColor *tsnFillColor;
@property (nonatomic, strong) NSColor *tsnStrokeColor;
@property (nonatomic, strong) NSColor *tsnTitleColor;
@property (nonatomic) CGFloat tsnCornerRadius;
@property (nonatomic) NSEdgeInsets tsnContentInsets;
@end

@implementation TSNButtonView
- (BOOL)isFlipped { return YES; }
- (NSSize)intrinsicContentSize {
    NSAttributedString *title = self.attributedTitle ?: [[NSAttributedString alloc] initWithString:self.title ?: @""];
    NSSize titleSize = title.length > 0 ? title.size : NSMakeSize(0, 0);
    return NSMakeSize(ceil(titleSize.width + self.tsnContentInsets.left + self.tsnContentInsets.right),
                      ceil(MAX(titleSize.height + self.tsnContentInsets.top + self.tsnContentInsets.bottom, 24)));
}
- (void)drawRect:(NSRect)dirtyRect {
    if (self.image != nil) {
        [super drawRect:dirtyRect];
        return;
    }
    NSRect bounds = self.bounds;
    NSBezierPath *path = [NSBezierPath bezierPathWithRoundedRect:bounds xRadius:self.tsnCornerRadius yRadius:self.tsnCornerRadius];
    if (self.tsnFillColor != nil && self.tsnFillColor.alphaComponent > 0) {
        [self.tsnFillColor setFill];
        [path fill];
    }
    if (self.tsnStrokeColor != nil && self.tsnStrokeColor.alphaComponent > 0) {
        [self.tsnStrokeColor setStroke];
        path.lineWidth = 1;
        [path stroke];
    }

    NSAttributedString *title = self.attributedTitle ?: [[NSAttributedString alloc] initWithString:self.title ?: @""];
    if (title.length == 0) return;
    NSRect contentRect = NSInsetRect(bounds, self.tsnContentInsets.left, self.tsnContentInsets.top);
    contentRect.size.width -= MAX(0, self.tsnContentInsets.right - self.tsnContentInsets.left);
    contentRect.size.height -= MAX(0, self.tsnContentInsets.bottom - self.tsnContentInsets.top);
    NSSize titleSize = title.size;
    NSRect titleRect = NSMakeRect(
        floor(NSMinX(contentRect) + (contentRect.size.width - titleSize.width) * 0.5),
        floor(NSMinY(contentRect) + (contentRect.size.height - titleSize.height) * 0.5),
        ceil(titleSize.width),
        ceil(titleSize.height)
    );
    [title drawInRect:titleRect];
}
@end

@interface TSNPressableView : NSView {
    UIClickFn _tsnClickFn;
    int _tsnClickTag;
}
@property (nonatomic, copy) NSString *title;
@property (nonatomic, strong) NSAttributedString *attributedTitle;
@property (nonatomic, strong) NSColor *tsnFillColor;
@property (nonatomic, strong) NSColor *tsnStrokeColor;
@property (nonatomic, strong) NSColor *tsnTitleColor;
@property (nonatomic) CGFloat tsnCornerRadius;
@property (nonatomic) NSEdgeInsets tsnContentInsets;
- (void)setClickFn:(UIClickFn)fn tag:(int)tag;
@end

@implementation TSNPressableView
- (instancetype)initWithTitle:(NSString *)title {
    self = [super initWithFrame:NSZeroRect];
    if (self) {
        _title = [title copy] ?: @"";
        _attributedTitle = [[NSAttributedString alloc] initWithString:_title];
        _tsnFillColor = NSColor.clearColor;
        _tsnStrokeColor = NSColor.clearColor;
        _tsnTitleColor = NSColor.labelColor;
        _tsnCornerRadius = 8;
        _tsnContentInsets = NSEdgeInsetsMake(6, 12, 6, 12);
    }
    return self;
}
- (BOOL)isFlipped { return YES; }
- (void)setAttributedTitle:(NSAttributedString *)attributedTitle {
    _attributedTitle = attributedTitle ?: [[NSAttributedString alloc] initWithString:self.title ?: @""];
    [self invalidateIntrinsicContentSize];
    [self setNeedsDisplay:YES];
}
- (NSSize)intrinsicContentSize {
    NSSize titleSize = self.attributedTitle.length > 0 ? self.attributedTitle.size : NSMakeSize(0, 0);
    return NSMakeSize(ceil(titleSize.width + self.tsnContentInsets.left + self.tsnContentInsets.right),
                      ceil(MAX(titleSize.height + self.tsnContentInsets.top + self.tsnContentInsets.bottom, 24)));
}
- (void)drawRect:(NSRect)dirtyRect {
    [super drawRect:dirtyRect];
    NSRect bounds = self.bounds;
    NSBezierPath *path = [NSBezierPath bezierPathWithRoundedRect:bounds xRadius:self.tsnCornerRadius yRadius:self.tsnCornerRadius];
    if (self.tsnFillColor != nil && self.tsnFillColor.alphaComponent > 0) {
        [self.tsnFillColor setFill];
        [path fill];
    }
    if (self.tsnStrokeColor != nil && self.tsnStrokeColor.alphaComponent > 0) {
        [self.tsnStrokeColor setStroke];
        path.lineWidth = 1;
        [path stroke];
    }
    if (self.attributedTitle.length == 0) return;
    NSSize titleSize = self.attributedTitle.size;
    NSRect titleRect = NSMakeRect(
        floor((bounds.size.width - titleSize.width) * 0.5),
        floor((bounds.size.height - titleSize.height) * 0.5),
        ceil(titleSize.width),
        ceil(titleSize.height)
    );
    [self.attributedTitle drawInRect:titleRect];
}
- (void)mouseDown:(NSEvent *)event {
    [super mouseDown:event];
    if (_tsnClickFn) _tsnClickFn(_tsnClickTag);
}
- (void)setClickFn:(UIClickFn)fn tag:(int)tag {
    _tsnClickFn = fn;
    _tsnClickTag = tag;
}
@end

UIHandle ui_symbol(const char *name, int size) {
    NSString *n = [NSString stringWithUTF8String:name];
    NSImage *img = [NSImage imageWithSystemSymbolName:n accessibilityDescription:n];
    NSImageView *iv = [NSImageView imageViewWithImage:img];
    iv.symbolConfiguration = [NSImageSymbolConfiguration configurationWithPointSize:size weight:NSFontWeightMedium];
    iv.contentTintColor = [NSColor colorWithWhite:0.7 alpha:1];
    tsn_create_view_node(iv, TSNNodeKindLeaf, 0, YES);
    retain_render(iv);
    return (__bridge UIHandle)iv;
}

void ui_symbol_set_color(UIHandle s, int c) {
    if ([(__bridge NSView *)s isKindOfClass:[NSImageView class]])
        ((NSImageView *)(__bridge NSView *)s).contentTintColor = system_color(c);
}

UIHandle ui_image(const char *path) {
    NSString *src = [NSString stringWithUTF8String:path];
    NSImage *img = nil;
    if ([src hasPrefix:@"http://"] || [src hasPrefix:@"https://"]) {
        img = [[NSImage alloc] initWithContentsOfURL:[NSURL URLWithString:src]];
    } else {
        img = [[NSImage alloc] initWithContentsOfFile:src];
        if (!img) {
            NSString *cwd = [[NSFileManager defaultManager] currentDirectoryPath];
            img = [[NSImage alloc] initWithContentsOfFile:[cwd stringByAppendingPathComponent:src]];
        }
    }

    NSImageView *iv = [NSImageView new];
    iv.image = img;
    iv.imageScaling = NSImageScaleProportionallyUpOrDown;
    iv.imageAlignment = NSImageAlignCenter;
    iv.wantsLayer = YES;
    iv.layer.masksToBounds = YES;
    /* Don't pre-set frame to natural image size — let Tailwind w-[]/h-[] and
       the layout system control sizing. Images without explicit dimensions will
       get avail_w/avail_h from their parent container (correct CSS behavior). */
    tsn_create_view_node(iv, TSNNodeKindLeaf, 0, YES);
    retain_render(iv);
    return (__bridge UIHandle)iv;
}

void ui_image_set_scaling(UIHandle img, int mode) {
    NSView *view = (__bridge NSView *)img;
    if (![view isKindOfClass:[NSImageView class]]) return;
    NSImageView *iv = (NSImageView *)view;
    switch (mode) {
        case 0: /* contain */
            iv.imageScaling = NSImageScaleProportionallyUpOrDown;
            break;
        case 1: /* cover — aspect-fill with cropping */
            iv.imageScaling = NSImageScaleAxesIndependently;
            iv.imageAlignment = NSImageAlignCenter;
            iv.wantsLayer = YES;
            iv.layer.contentsGravity = kCAGravityResizeAspectFill;
            iv.layer.masksToBounds = YES;
            break;
        case 2: /* fill — stretch */
            iv.imageScaling = NSImageScaleAxesIndependently;
            break;
    }
}

/* ─── Search Field ───────────────────────────────────────────────── */

UIHandle ui_search_field(const char *placeholder) {
    NSSearchField *f = [[NSSearchField alloc] initWithFrame:NSMakeRect(0, 0, 0, 28)];
    f.placeholderString = [NSString stringWithUTF8String:placeholder];
    f.appearance = [NSAppearance appearanceNamed:NSAppearanceNameDarkAqua];
    tsn_text_set_kind(f, TSNTextRuntimeKindSearch);
    tsn_text_set_wrap_mode(f, TSNTextRuntimeWrapModeTruncate, NO);
    TSNShadowNode *node = tsn_create_view_node(f, TSNNodeKindLeaf, 0, YES);
    YGNodeStyleSetHeight(node.yogaNode, 28);
    retain_render(f);
    return (__bridge UIHandle)f;
}

UIHandle ui_text_field(const char *placeholder) {
    NSTextField *f = [[NSTextField alloc] initWithFrame:NSMakeRect(0, 0, 0, 24)];
    f.placeholderString = [NSString stringWithUTF8String:placeholder];
    f.drawsBackground = NO;
    f.bordered = YES;
    f.bezelStyle = NSTextFieldRoundedBezel;
    tsn_text_set_kind(f, TSNTextRuntimeKindInput);
    tsn_text_set_wrap_mode(f, TSNTextRuntimeWrapModeTruncate, NO);
    TSNShadowNode *node = tsn_create_view_node(f, TSNNodeKindLeaf, 0, YES);
    YGNodeStyleSetHeight(node.yogaNode, 24);
    retain_render(f);
    return (__bridge UIHandle)f;
}

UIHandle ui_text_area(const char *placeholder) {
    NSScrollView *scroll = [[NSScrollView alloc] initWithFrame:NSMakeRect(0, 0, 0, 96)];
    scroll.hasVerticalScroller = YES;
    scroll.hasHorizontalScroller = NO;
    scroll.autohidesScrollers = YES;
    scroll.drawsBackground = NO;
    scroll.borderType = NSBezelBorder;

    NSTextContainer *container = [[NSTextContainer alloc] initWithContainerSize:NSMakeSize(CGFLOAT_MAX, CGFLOAT_MAX)];
    container.widthTracksTextView = YES;
    NSLayoutManager *layoutManager = [NSLayoutManager new];
    [layoutManager addTextContainer:container];
    NSTextStorage *storage = [NSTextStorage new];
    [storage addLayoutManager:layoutManager];

    TSNTextAreaView *textView = [[TSNTextAreaView alloc] initWithFrame:NSMakeRect(0, 0, 0, 96) textContainer:container];
    NSString *placeholderText = [NSString stringWithUTF8String:placeholder];
    if ([textView respondsToSelector:NSSelectorFromString(@"setPlaceholderString:")]) {
        [textView setValue:placeholderText forKey:@"placeholderString"];
    }
    textView.minSize = NSMakeSize(0, 96);
    textView.maxSize = NSMakeSize(CGFLOAT_MAX, CGFLOAT_MAX);
    textView.verticallyResizable = YES;
    textView.horizontallyResizable = NO;
    textView.richText = NO;
    textView.importsGraphics = NO;
    textView.usesFindBar = NO;
    textView.allowsUndo = YES;
    textView.automaticQuoteSubstitutionEnabled = NO;
    textView.automaticDashSubstitutionEnabled = NO;
    textView.font = tsn_browser_text_font(14, NSFontWeightRegular, NO);
    textView.textColor = [NSColor colorWithWhite:0.92 alpha:1];
    textView.backgroundColor = NSColor.clearColor;
    scroll.documentView = textView;

    tsn_text_set_kind(scroll, TSNTextRuntimeKindTextArea);
    tsn_text_set_kind(textView, TSNTextRuntimeKindTextArea);
    tsn_text_set_wrap_mode(scroll, TSNTextRuntimeWrapModeWrap, YES);
    tsn_text_set_wrap_mode(textView, TSNTextRuntimeWrapModeWrap, YES);
    tsn_text_set_line_height_multiplier(scroll, tsn_default_css_line_height_for_size(14) / 14);
    tsn_text_set_line_height_multiplier(textView, tsn_default_css_line_height_for_size(14) / 14);

    TSNShadowNode *node = tsn_create_view_node(scroll, TSNNodeKindLeaf, 0, YES);
    YGNodeStyleSetHeight(node.yogaNode, 96);
    retain_render(textView);
    retain_render(scroll);
    return (__bridge UIHandle)scroll;
}

@interface UISelectDelegate : NSObject
@property (nonatomic) UITextChangedFn callback;
@end
@implementation UISelectDelegate
- (void)changed:(id)sender {
    if (!_callback) return;
    if ([sender isKindOfClass:[NSPopUpButton class]]) {
        NSString *title = ((NSPopUpButton *)sender).titleOfSelectedItem ?: @"";
        _callback(title.UTF8String);
    }
}
@end

UIHandle ui_select(void) {
    NSPopUpButton *button = [[NSPopUpButton alloc] initWithFrame:NSMakeRect(0, 0, 0, 28) pullsDown:NO];
    button.autoenablesItems = NO;
    button.appearance = [NSAppearance appearanceNamed:NSAppearanceNameDarkAqua];
    TSNShadowNode *node = tsn_create_view_node(button, TSNNodeKindLeaf, 0, YES);
    YGNodeStyleSetHeight(node.yogaNode, 28);
    retain_render(button);
    return (__bridge UIHandle)button;
}

void ui_select_add_option(UIHandle select, const char *label) {
    NSView *view = (__bridge NSView *)select;
    if (![view isKindOfClass:[NSPopUpButton class]]) return;
    NSString *title = label ? [NSString stringWithUTF8String:label] : @"";
    [((NSPopUpButton *)view) addItemWithTitle:title];
}

void ui_select_set_value(UIHandle select, const char *value) {
    NSView *view = (__bridge NSView *)select;
    if (![view isKindOfClass:[NSPopUpButton class]]) return;
    NSString *title = value ? [NSString stringWithUTF8String:value] : @"";
    [((NSPopUpButton *)view) selectItemWithTitle:title];
}

void ui_on_text_changed(UIHandle field, UITextChangedFn fn) {
    UISearchDelegate *d = [UISearchDelegate new];
    d.callback = fn;
    retain_persistent(d);
    if ([(__bridge NSView *)field isKindOfClass:[NSSearchField class]])
        ((NSSearchField *)(__bridge NSView *)field).delegate = (id<NSSearchFieldDelegate>)d;
    else if ([(__bridge NSView *)field isKindOfClass:[NSTextField class]])
        ((NSTextField *)(__bridge NSView *)field).delegate = (id<NSTextFieldDelegate>)d;
    else if ([(__bridge NSView *)field isKindOfClass:[NSScrollView class]]) {
        NSView *document = ((NSScrollView *)(__bridge NSView *)field).documentView;
        if ([document isKindOfClass:[NSTextView class]]) {
            ((NSTextView *)document).delegate = (id<NSTextViewDelegate>)d;
        }
    }
}

void ui_on_select_changed(UIHandle select, UITextChangedFn fn) {
    if (!fn) return;
    NSView *view = (__bridge NSView *)select;
    if (![view isKindOfClass:[NSPopUpButton class]]) return;
    UISelectDelegate *delegate = [UISelectDelegate new];
    delegate.callback = fn;
    ((NSPopUpButton *)view).target = delegate;
    ((NSPopUpButton *)view).action = @selector(changed:);
    retain_persistent(delegate);
}

void ui_text_input_set_value(UIHandle field, const char *text) {
    NSView *view = (__bridge NSView *)field;
    NSString *value = text ? [NSString stringWithUTF8String:text] : @"";
    if ([view isKindOfClass:[NSSearchField class]]) {
        ((NSSearchField *)view).stringValue = value;
        return;
    }
    if ([view isKindOfClass:[NSTextField class]]) {
        ((NSTextField *)view).stringValue = value;
        return;
    }
    if ([view isKindOfClass:[NSScrollView class]]) {
        NSView *document = ((NSScrollView *)view).documentView;
        if ([document isKindOfClass:[NSTextView class]]) {
            ((NSTextView *)document).string = value;
            [document setNeedsDisplay:YES];
        }
    }
}

/* ─── Button ─────────────────────────────────────────────────────── */

@interface UIButtonTarget : NSObject
@property (nonatomic) UIClickFn fn;
@property (nonatomic) int tag;
@end
@implementation UIButtonTarget
- (void)clicked:(id)sender { if (_fn) _fn(_tag); }
@end

@interface UIViewClickTarget : NSObject
@property (nonatomic) UIClickFn fn;
@property (nonatomic) int tag;
@end
@implementation UIViewClickTarget
- (void)clicked:(id)sender { if (_fn) _fn(_tag); }
@end

@interface UIBoolTarget : NSObject
@property (nonatomic) UIBoolChangedFn fn;
@end
@implementation UIBoolTarget
- (void)changed:(id)sender {
    if (!_fn) return;
    id control = sender;
    bool on = false;
    if ([control isKindOfClass:[NSSwitch class]]) on = (((NSSwitch *)control).state == NSControlStateValueOn);
    else if ([control isKindOfClass:[NSButton class]]) on = (((NSButton *)control).state == NSControlStateValueOn);
    _fn(on);
}
@end

UIHandle ui_button(const char *label, UIClickFn fn, int tag) {
    TSNPressableView *button = [[TSNPressableView alloc] initWithTitle:[NSString stringWithUTF8String:label]];
    [button setClickFn:fn tag:tag];
    tsn_create_view_node(button, TSNNodeKindLeaf, 0, YES);
    retain_render(button);
    return (__bridge UIHandle)button;
}

UIHandle ui_checkbox(const char *label, bool initial) {
    NSButton *b = [NSButton checkboxWithTitle:[NSString stringWithUTF8String:label] target:nil action:nil];
    b.state = initial ? NSControlStateValueOn : NSControlStateValueOff;
    tsn_bool_control_set_kind(b, TSNBoolControlRuntimeKindCheckbox);
    tsn_create_view_node(b, TSNNodeKindLeaf, 0, YES);
    retain_render(b);
    return (__bridge UIHandle)b;
}

UIHandle ui_radio(const char *label, bool initial) {
    NSButton *b = [NSButton radioButtonWithTitle:[NSString stringWithUTF8String:label] target:nil action:nil];
    b.state = initial ? NSControlStateValueOn : NSControlStateValueOff;
    tsn_bool_control_set_kind(b, TSNBoolControlRuntimeKindRadio);
    tsn_create_view_node(b, TSNNodeKindLeaf, 0, YES);
    retain_render(b);
    return (__bridge UIHandle)b;
}

UIHandle ui_switch(bool initial) {
    NSSwitch *sw = [NSSwitch new];
    sw.state = initial ? NSControlStateValueOn : NSControlStateValueOff;
    tsn_bool_control_set_kind(sw, TSNBoolControlRuntimeKindSwitch);
    tsn_create_view_node(sw, TSNNodeKindLeaf, 0, YES);
    retain_render(sw);
    return (__bridge UIHandle)sw;
}

void ui_on_bool_changed(UIHandle control, UIBoolChangedFn fn) {
    if (!fn) return;
    NSView *view = (__bridge NSView *)control;
    UIBoolTarget *target = [UIBoolTarget new];
    target.fn = fn;
    if ([view isKindOfClass:[NSSwitch class]]) {
        ((NSSwitch *)view).target = target;
        ((NSSwitch *)view).action = @selector(changed:);
    } else if ([view isKindOfClass:[NSButton class]]) {
        ((NSButton *)view).target = target;
        ((NSButton *)view).action = @selector(changed:);
    } else {
        return;
    }
    retain_persistent(target);
}

void ui_bool_control_set_value(UIHandle control, bool on) {
    NSView *view = (__bridge NSView *)control;
    NSControlStateValue state = on ? NSControlStateValueOn : NSControlStateValueOff;
    if ([view isKindOfClass:[NSSwitch class]]) {
        ((NSSwitch *)view).state = state;
        return;
    }
    if ([view isKindOfClass:[NSButton class]]) {
        ((NSButton *)view).state = state;
    }
}

UIHandle ui_button_icon(const char *sf_symbol, const char *label, UIClickFn fn, int tag) {
    NSString *sym = [NSString stringWithUTF8String:sf_symbol];
    NSImage *img = [NSImage imageWithSystemSymbolName:sym accessibilityDescription:sym];
    TSNButtonView *b = [TSNButtonView buttonWithTitle:[NSString stringWithUTF8String:label]
                                                image:img target:nil action:nil];
    b.bezelStyle = NSBezelStyleRecessed;
    b.imagePosition = NSImageLeading;
    if (fn) {
        UIButtonTarget *t = [UIButtonTarget new];
        t.fn = fn; t.tag = tag;
        b.target = t; b.action = @selector(clicked:);
        retain_persistent(t);
    }
    tsn_create_view_node(b, TSNNodeKindLeaf, 0, YES);
    retain_render(b);
    return (__bridge UIHandle)b;
}

static void style_button_surface(NSButton *btn, NSColor *bg, NSColor *fg, CGFloat radius,
                                 bool bordered, NSTextAlignment align,
                                 CGFloat top, CGFloat left, CGFloat bottom, CGFloat right,
                                 NSFontWeight weight) {
    NSString *trimmed = [btn.title stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
    if (left > 10 || right > 10) {
        trimmed = [NSString stringWithFormat:@"  %@  ", trimmed];
    }
    btn.title = trimmed;
    btn.bordered = bordered;
    btn.alignment = align;
    btn.wantsLayer = YES;
    btn.layer.cornerRadius = radius;
    btn.layer.masksToBounds = YES;
    btn.layer.backgroundColor = bg ? bg.CGColor : NSColor.clearColor.CGColor;
    NSFont *font = [NSFont systemFontOfSize:13 weight:weight];
    btn.font = font;
    btn.contentTintColor = fg;
    btn.bezelColor = bg ?: NSColor.clearColor;
    btn.focusRingType = NSFocusRingTypeNone;
    NSDictionary *attrs = @{
        NSForegroundColorAttributeName: fg ?: NSColor.labelColor,
        NSFontAttributeName: font,
    };
    btn.attributedTitle = [[NSAttributedString alloc] initWithString:trimmed attributes:attrs];
    btn.attributedAlternateTitle = btn.attributedTitle;
    if ([btn isKindOfClass:[TSNButtonView class]]) {
        TSNButtonView *custom = (TSNButtonView *)btn;
        custom.tsnFillColor = bg ?: NSColor.clearColor;
        custom.tsnStrokeColor = bordered ? (bg ?: fg ?: NSColor.clearColor) : NSColor.clearColor;
        custom.tsnTitleColor = fg ?: NSColor.labelColor;
        custom.tsnCornerRadius = radius;
        custom.tsnContentInsets = NSEdgeInsetsMake(top, left, bottom, right);
        [custom invalidateIntrinsicContentSize];
    }
    [btn setNeedsDisplay:YES];
}

void ui_button_set_style(UIHandle b, int style) {
    NSView *view = (__bridge NSView *)b;
    if ([view isKindOfClass:[TSNPressableView class]]) {
        TSNPressableView *btn = (TSNPressableView *)view;
        NSString *trimmed = [btn.title stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
        NSColor *bg = NSColor.clearColor;
        NSColor *fg = NSColor.labelColor;
        CGFloat radius = 10;
        CGFloat top = 6, left = 12, bottom = 6, right = 12;
        NSFontWeight weight = NSFontWeightMedium;
        switch (style) {
            case 1:
                bg = NSColor.whiteColor;
                fg = NSColor.blackColor;
                radius = 999;
                top = 8; left = 20; bottom = 8; right = 20;
                weight = NSFontWeightSemibold;
                trimmed = [NSString stringWithFormat:@"  %@  ", trimmed];
                break;
            case 2:
                bg = [NSColor systemRedColor];
                fg = NSColor.whiteColor;
                radius = 999;
                top = 8; left = 16; bottom = 8; right = 16;
                weight = NSFontWeightSemibold;
                trimmed = [NSString stringWithFormat:@"  %@  ", trimmed];
                break;
            case 3:
                bg = NSColor.clearColor;
                fg = NSColor.systemBlueColor;
                radius = 0;
                top = 4; left = 6; bottom = 4; right = 6;
                weight = NSFontWeightSemibold;
                break;
            case 4:
                bg = NSColor.clearColor;
                fg = [NSColor colorWithWhite:0.88 alpha:1];
                radius = 6;
                top = 10; left = 12; bottom = 10; right = 12;
                weight = NSFontWeightMedium;
                break;
            case 5:
                bg = [NSColor colorWithWhite:0.22 alpha:1];
                fg = NSColor.systemBlueColor;
                radius = 6;
                top = 10; left = 12; bottom = 10; right = 12;
                weight = NSFontWeightSemibold;
                break;
            case 6:
                bg = NSColor.whiteColor;
                fg = NSColor.systemBlueColor;
                radius = 999;
                top = 4; left = 16; bottom = 4; right = 16;
                weight = NSFontWeightSemibold;
                trimmed = [NSString stringWithFormat:@"  %@  ", trimmed];
                break;
            case 7:
                bg = [NSColor colorWithWhite:0.25 alpha:1];
                fg = [NSColor colorWithWhite:0.92 alpha:1];
                radius = 999;
                top = 5; left = 12; bottom = 5; right = 12;
                weight = NSFontWeightSemibold;
                break;
            default:
                bg = [NSColor colorWithWhite:0.16 alpha:1];
                fg = [NSColor colorWithWhite:0.92 alpha:1];
                radius = 10;
                top = 6; left = 12; bottom = 6; right = 12;
                weight = NSFontWeightMedium;
                break;
        }
        NSFont *font = [NSFont systemFontOfSize:13 weight:weight];
        btn.tsnFillColor = bg;
        btn.tsnStrokeColor = NSColor.clearColor;
        btn.tsnTitleColor = fg;
        btn.tsnCornerRadius = radius;
        btn.tsnContentInsets = NSEdgeInsetsMake(top, left, bottom, right);
        btn.attributedTitle = [[NSAttributedString alloc] initWithString:trimmed attributes:@{
            NSForegroundColorAttributeName: fg,
            NSFontAttributeName: font,
        }];
        [btn invalidateIntrinsicContentSize];
        [btn setNeedsDisplay:YES];
        return;
    }
    NSButton *btn = (NSButton *)view;
    if (![btn isKindOfClass:[NSButton class]]) return;
    switch (style) {
        case 1:
            btn.bezelStyle = NSBezelStyleRounded;
            style_button_surface(btn, NSColor.whiteColor, NSColor.blackColor, 999, NO,
                                 NSTextAlignmentCenter, 8, 20, 8, 20, NSFontWeightSemibold);
            break;
        case 2:
            style_button_surface(btn, [NSColor systemRedColor], NSColor.whiteColor, 999, NO,
                                 NSTextAlignmentCenter, 8, 16, 8, 16, NSFontWeightSemibold);
            break;
        case 3:
            style_button_surface(btn, nil, NSColor.systemBlueColor, 0, NO,
                                 NSTextAlignmentCenter, 4, 6, 4, 6, NSFontWeightSemibold);
            break;
        case 4:
            style_button_surface(btn, nil, [NSColor colorWithWhite:0.88 alpha:1], 6, NO,
                                 NSTextAlignmentLeft, 10, 12, 10, 12, NSFontWeightMedium);
            break;
        case 5:
            style_button_surface(btn, [NSColor colorWithWhite:0.22 alpha:1], NSColor.systemBlueColor, 6, NO,
                                 NSTextAlignmentLeft, 10, 12, 10, 12, NSFontWeightSemibold);
            break;
        case 6:
            style_button_surface(btn, NSColor.whiteColor, NSColor.systemBlueColor, 999, NO,
                                 NSTextAlignmentCenter, 4, 16, 4, 16, NSFontWeightSemibold);
            break;
        case 7:
            style_button_surface(btn, [NSColor colorWithWhite:0.25 alpha:1], [NSColor colorWithWhite:0.92 alpha:1], 999, NO,
                                 NSTextAlignmentCenter, 5, 12, 5, 12, NSFontWeightSemibold);
            break;
        default:
            style_button_surface(btn, [NSColor colorWithWhite:0.16 alpha:1], [NSColor colorWithWhite:0.92 alpha:1], 10, NO,
                                 NSTextAlignmentCenter, 6, 12, 6, 12, NSFontWeightMedium);
            break;
    }
}

void ui_on_click(UIHandle v, UIClickFn fn, int tag) {
    if (!fn) return;
    NSView *view = (__bridge NSView *)v;
    UIViewClickTarget *target = [UIViewClickTarget new];
    target.fn = fn;
    target.tag = tag;
    NSClickGestureRecognizer *gesture = [[NSClickGestureRecognizer alloc] initWithTarget:target action:@selector(clicked:)];
    gesture.buttonMask = 0x1;
    [view addGestureRecognizer:gesture];
    retain_persistent(target);
    retain_persistent(gesture);
}
