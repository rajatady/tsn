/* ─── SF Symbols ─────────────────────────────────────────────────── */

UIHandle ui_symbol(const char *name, int size) {
    NSString *n = [NSString stringWithUTF8String:name];
    NSImage *img = [NSImage imageWithSystemSymbolName:n accessibilityDescription:n];
    NSImageView *iv = [NSImageView imageViewWithImage:img];
    iv.symbolConfiguration = [NSImageSymbolConfiguration configurationWithPointSize:size weight:NSFontWeightMedium];
    iv.contentTintColor = [NSColor colorWithWhite:0.7 alpha:1];
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
    NSSearchField *f = [[NSSearchField alloc] initWithFrame:NSMakeRect(0, 0, 300, 28)];
    f.placeholderString = [NSString stringWithUTF8String:placeholder];
    f.appearance = [NSAppearance appearanceNamed:NSAppearanceNameDarkAqua];
    retain_render(f);
    return (__bridge UIHandle)f;
}

UIHandle ui_text_field(const char *placeholder) {
    NSTextField *f = [[NSTextField alloc] initWithFrame:NSMakeRect(0, 0, 200, 24)];
    f.placeholderString = [NSString stringWithUTF8String:placeholder];
    f.drawsBackground = NO;
    f.bordered = YES;
    f.bezelStyle = NSTextFieldRoundedBezel;
    retain_render(f);
    return (__bridge UIHandle)f;
}

void ui_on_text_changed(UIHandle field, UITextChangedFn fn) {
    UISearchDelegate *d = [UISearchDelegate new];
    d.callback = fn;
    retain_persistent(d);
    if ([(__bridge NSView *)field isKindOfClass:[NSSearchField class]])
        ((NSSearchField *)(__bridge NSView *)field).delegate = d;
    else if ([(__bridge NSView *)field isKindOfClass:[NSTextField class]])
        ((NSTextField *)(__bridge NSView *)field).delegate = d;
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

UIHandle ui_button(const char *label, UIClickFn fn, int tag) {
    NSButton *b = [NSButton buttonWithTitle:[NSString stringWithUTF8String:label]
                                     target:nil action:nil];
    b.bezelStyle = NSBezelStyleRecessed;
    if (fn) {
        UIButtonTarget *t = [UIButtonTarget new];
        t.fn = fn;
        t.tag = tag;
        b.target = t;
        b.action = @selector(clicked:);
        retain_persistent(t);
    }
    retain_render(b);
    return (__bridge UIHandle)b;
}

UIHandle ui_button_icon(const char *sf_symbol, const char *label, UIClickFn fn, int tag) {
    NSString *sym = [NSString stringWithUTF8String:sf_symbol];
    NSImage *img = [NSImage imageWithSystemSymbolName:sym accessibilityDescription:sym];
    NSButton *b = [NSButton buttonWithTitle:[NSString stringWithUTF8String:label]
                                      image:img target:nil action:nil];
    b.bezelStyle = NSBezelStyleRecessed;
    b.imagePosition = NSImageLeading;
    if (fn) {
        UIButtonTarget *t = [UIButtonTarget new];
        t.fn = fn; t.tag = tag;
        b.target = t; b.action = @selector(clicked:);
        retain_persistent(t);
    }
    retain_render(b);
    return (__bridge UIHandle)b;
}

static void style_button_surface(NSButton *btn, NSColor *bg, NSColor *fg, CGFloat radius,
                                 bool bordered, NSTextAlignment align,
                                 CGFloat top, CGFloat left, CGFloat bottom, CGFloat right,
                                 NSFontWeight weight) {
    btn.bordered = bordered;
    btn.alignment = align;
    btn.wantsLayer = YES;
    btn.layer.cornerRadius = radius;
    btn.layer.masksToBounds = YES;
    btn.layer.backgroundColor = bg ? bg.CGColor : NSColor.clearColor.CGColor;
    btn.font = [NSFont systemFontOfSize:13 weight:weight];
    btn.contentTintColor = fg;
    btn.bezelColor = bg ?: NSColor.clearColor;
    if (left > 10 || right > 10) {
        NSString *trimmed = [btn.title stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
        btn.title = [NSString stringWithFormat:@"  %@  ", trimmed];
    }
}

void ui_button_set_style(UIHandle b, int style) {
    NSButton *btn = (__bridge NSButton *)b;
    if (![btn isKindOfClass:[NSButton class]]) return;
    switch (style) {
        case 1:
            btn.bezelStyle = NSBezelStyleRounded;
            style_button_surface(btn, NSColor.controlAccentColor, NSColor.whiteColor, 999, NO,
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
            style_button_surface(btn, nil, [NSColor colorWithWhite:0.88 alpha:1], 12, NO,
                                 NSTextAlignmentLeft, 8, 12, 8, 12, NSFontWeightMedium);
            break;
        case 5:
            style_button_surface(btn, [NSColor colorWithWhite:0.22 alpha:1], NSColor.systemBlueColor, 12, NO,
                                 NSTextAlignmentLeft, 8, 12, 8, 12, NSFontWeightSemibold);
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
