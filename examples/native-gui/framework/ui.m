/*
 * StrictTS Native UI Runtime — AppKit implementation
 *
 * Every ui_* function creates real AppKit views.
 * TypeScript developers never see this file — they call typed functions,
 * the compiler emits C calls, this runtime does the rest.
 */

#import <Cocoa/Cocoa.h>
#import <QuartzCore/QuartzCore.h>
#include "ui.h"

/* ─── Internal Helpers ───────────────────────────────────────────── */

static NSColor *system_color(int idx) {
    switch (idx) {
        case 0:  return NSColor.labelColor;
        case 1:  return NSColor.secondaryLabelColor;
        case 2:  return NSColor.tertiaryLabelColor;
        case 3:  return NSColor.systemBlueColor;
        case 4:  return NSColor.systemGreenColor;
        case 5:  return NSColor.systemRedColor;
        case 6:  return NSColor.systemOrangeColor;
        case 7:  return NSColor.systemYellowColor;
        case 8:  return NSColor.systemPurpleColor;
        case 9:  return NSColor.systemPinkColor;
        case 10: return NSColor.systemTealColor;
        case 11: return NSColor.systemIndigoColor;
        case 12: return NSColor.systemCyanColor;
        default: return NSColor.labelColor;
    }
}

/* ─── Spacer (used in layout) ────────────────────────────────────── */
@interface UISpacer : NSView @end
@implementation UISpacer @end

/* ─── Stack Layout View ──────────────────────────────────────────── */

@interface UIStackContainer : NSView
@property int direction;  /* 0=V, 1=H */
@property int padding_top, padding_right, padding_bottom, padding_left;
@property int spacing;
@property int flex;
@property int fixed_width, fixed_height;
@property (nonatomic, strong) NSMutableArray<NSView *> *children;
@end

@implementation UIStackContainer
- (instancetype)init {
    self = [super init];
    _children = [NSMutableArray new];
    _spacing = 8;
    _fixed_width = -1;
    _fixed_height = -1;
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

        if (_direction == 0) { /* vertical: width = max, height = sum */
            if (cw > w - _padding_left - _padding_right) w = cw + _padding_left + _padding_right;
            h += ch;
        } else { /* horizontal: width = sum, height = max */
            w += cw;
            if (ch > h - _padding_top - _padding_bottom) h = ch + _padding_top + _padding_bottom;
        }
    }

    if (_direction == 0) h += spacing_total;
    else w += spacing_total;

    return NSMakeSize(w, h);
}

- (void)layout {
    [super layout];
    NSRect b = self.bounds;
    CGFloat x = _padding_left;
    CGFloat y = _padding_top;
    CGFloat avail_w = b.size.width - _padding_left - _padding_right;
    CGFloat avail_h = b.size.height - _padding_top - _padding_bottom;

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
                /* No fixed size, no flex — use natural (content) size */
                NSSize ns = [sc naturalSize];
                fixed_total += (_direction == 0 ? ns.height : ns.width);
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
        } else if ([child isKindOfClass:[UISpacer class]] ||
                   [child isKindOfClass:[NSScrollView class]]) {
            /* Spacers and scroll views absorb remaining space — don't count as fixed */
        } else {
            NSSize intrinsic = child.intrinsicContentSize;
            CGFloat fw = child.frame.size.width, fh = child.frame.size.height;
            if (_direction == 0) fixed_total += (intrinsic.height > 0 ? intrinsic.height : (fh > 0 ? fh : 24));
            else fixed_total += (intrinsic.width > 0 ? intrinsic.width : (fw > 0 ? fw : 60));
        }
    }
    CGFloat spacing_total = (_children.count > 1) ? (_children.count - 1) * _spacing : 0;
    CGFloat flex_space = (_direction == 0 ? avail_h : avail_w) - fixed_total - spacing_total;
    if (flex_space < 0) flex_space = 0;

    for (NSView *child in _children) {
        CGFloat cw, ch;
        int child_flex = 0;

        if ([child isKindOfClass:[UIStackContainer class]]) {
            UIStackContainer *sc = (UIStackContainer *)child;
            child_flex = sc.flex;
            if (_direction == 1) {
                /* Horizontal parent: width = fixed or natural, height = fill */
                cw = (sc.fixed_width > 0) ? sc.fixed_width : (sc.flex > 0 ? 0 : [sc naturalSize].width);
                ch = (sc.fixed_height > 0) ? sc.fixed_height : avail_h;
            } else {
                /* Vertical parent: width = fill, height = fixed or natural */
                cw = (sc.fixed_width > 0) ? sc.fixed_width : avail_w;
                ch = (sc.fixed_height > 0) ? sc.fixed_height : (sc.flex > 0 ? 0 : [sc naturalSize].height);
            }
        } else if ([child isKindOfClass:[NSScrollView class]]) {
            /* Scroll views fill available space */
            cw = avail_w;
            ch = avail_h;
        } else {
            NSSize intrinsic = child.intrinsicContentSize;
            CGFloat frameW = child.frame.size.width;
            CGFloat frameH = child.frame.size.height;
            /* Use intrinsic size, then frame size, then fallback */
            cw = (_direction == 1) ? (intrinsic.width > 0 ? intrinsic.width : (frameW > 0 ? frameW : 60)) : avail_w;
            ch = (_direction == 0) ? (intrinsic.height > 0 ? intrinsic.height : (frameH > 0 ? frameH : 24)) : avail_h;
        }

        if (child_flex > 0 && nflex > 0) {
            CGFloat portion = flex_space * child_flex / nflex;
            if (_direction == 0) ch = portion; else cw = portion;
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

        child.frame = NSMakeRect(x, y, cw, ch);
        /* Fill inner content of blur/scroll views only — don't clobber nested stack layouts */
        if ([child isKindOfClass:[NSVisualEffectView class]] ||
            [child isKindOfClass:[NSScrollView class]]) {
            for (NSView *sub in child.subviews) sub.frame = child.bounds;
        }

        if (_direction == 0) y += ch + _spacing;
        else x += cw + _spacing;
    }
}
@end

/* ─── Bar Chart View ─────────────────────────────────────────────── */

typedef struct { char label[64]; double value; NSColor * __unsafe_unretained color; } BarData;

@interface UIBarChartView : NSView {
@public
    BarData _bars[32];
}
@property (nonatomic) int bar_count;
@property (nonatomic, copy) NSString *chart_title;
@property (nonatomic) int fixed_height;
@end

@implementation UIBarChartView
- (BOOL)isFlipped { return YES; }
- (NSSize)intrinsicContentSize { return NSMakeSize(-1, _fixed_height > 0 ? _fixed_height : 200); }
- (void)drawRect:(NSRect)dirty {
    NSRect b = self.bounds;
    [[NSColor colorWithWhite:0.1 alpha:1] setFill];
    [[NSBezierPath bezierPathWithRoundedRect:b xRadius:10 yRadius:10] fill];

    if (_bar_count == 0) return;
    double maxVal = 0;
    for (int i = 0; i < _bar_count; i++) if (_bars[i].value > maxVal) maxVal = _bars[i].value;
    if (maxVal == 0) maxVal = 1;

    CGFloat pad = 16, topPad = _chart_title ? 34 : 16;
    CGFloat barW = (b.size.width - pad * 2) / _bar_count - 6;
    CGFloat chartH = b.size.height - topPad - 36;

    if (_chart_title) {
        NSDictionary *a = @{NSFontAttributeName: [NSFont systemFontOfSize:12 weight:NSFontWeightSemibold],
                            NSForegroundColorAttributeName: [NSColor colorWithWhite:0.85 alpha:1]};
        [_chart_title drawAtPoint:NSMakePoint(pad, 10) withAttributes:a];
    }

    NSDictionary *la = @{NSFontAttributeName: [NSFont systemFontOfSize:9 weight:NSFontWeightMedium],
                         NSForegroundColorAttributeName: [NSColor colorWithWhite:0.55 alpha:1]};
    NSDictionary *va = @{NSFontAttributeName: [NSFont monospacedDigitSystemFontOfSize:10 weight:NSFontWeightBold],
                         NSForegroundColorAttributeName: [NSColor colorWithWhite:0.9 alpha:1]};

    for (int i = 0; i < _bar_count; i++) {
        CGFloat x = pad + i * (barW + 6);
        CGFloat barH = (_bars[i].value / maxVal) * chartH * 0.88;
        CGFloat y = b.size.height - 28 - barH;

        [(_bars[i].color ?: NSColor.systemBlueColor) setFill];
        [[NSBezierPath bezierPathWithRoundedRect:NSMakeRect(x, y, barW, barH) xRadius:3 yRadius:3] fill];

        /* Glow */
        [[(_bars[i].color ?: NSColor.systemBlueColor) colorWithAlphaComponent:0.08] setFill];
        NSRectFill(NSMakeRect(x - 2, y, barW + 4, barH));

        NSString *lbl = [NSString stringWithUTF8String:_bars[i].label];
        NSSize ls = [lbl sizeWithAttributes:la];
        [lbl drawAtPoint:NSMakePoint(x + (barW - ls.width) / 2, b.size.height - 16) withAttributes:la];

        NSString *val = [NSString stringWithFormat:@"%.0f", _bars[i].value];
        NSSize vs = [val sizeWithAttributes:va];
        [val drawAtPoint:NSMakePoint(x + (barW - vs.width) / 2, y - 16) withAttributes:va];
    }
}
@end

/* ─── Stat Card View ─────────────────────────────────────────────── */

@interface UIStatView : NSView
@property (nonatomic, copy) NSString *value_text, *label_text;
@property (nonatomic, strong) NSColor *accent;
@end

@implementation UIStatView
- (BOOL)isFlipped { return YES; }
- (NSSize)intrinsicContentSize { return NSMakeSize(160, 80); }
- (void)drawRect:(NSRect)dirty {
    NSRect b = self.bounds;
    [[NSColor colorWithWhite:0.12 alpha:1] setFill];
    [[NSBezierPath bezierPathWithRoundedRect:b xRadius:10 yRadius:10] fill];

    /* Accent bar */
    [_accent setFill];
    [[NSBezierPath bezierPathWithRoundedRect:NSMakeRect(0, 0, 3, b.size.height) xRadius:1.5 yRadius:1.5] fill];

    NSDictionary *va = @{NSFontAttributeName: [NSFont monospacedDigitSystemFontOfSize:28 weight:NSFontWeightBold],
                         NSForegroundColorAttributeName: [NSColor colorWithWhite:0.95 alpha:1]};
    NSDictionary *la = @{NSFontAttributeName: [NSFont systemFontOfSize:11 weight:NSFontWeightMedium],
                         NSForegroundColorAttributeName: [NSColor colorWithWhite:0.5 alpha:1]};
    [_value_text drawAtPoint:NSMakePoint(14, 14) withAttributes:va];
    [_label_text drawAtPoint:NSMakePoint(14, 52) withAttributes:la];
}
@end

/* ─── Table Data Source ──────────────────────────────────────────── */

@interface UITableManager : NSObject <NSTableViewDataSource, NSTableViewDelegate>
@property (nonatomic) int row_count;
@property (nonatomic) UITableCellFn cell_fn;
@property (nonatomic) void *cell_ctx;
@property (nonatomic, strong) NSTableView *table;
@property (nonatomic) int row_height;
@property (nonatomic) bool alternating;
@end

@implementation UITableManager
- (NSInteger)numberOfRowsInTableView:(NSTableView *)tv {
    return _row_count > 500 ? 500 : _row_count;
}
- (NSView *)tableView:(NSTableView *)tv viewForTableColumn:(NSTableColumn *)col row:(NSInteger)row {
    NSString *ident = col.identifier;
    NSTextField *cell = [tv makeViewWithIdentifier:ident owner:self];
    if (!cell) {
        cell = [NSTextField labelWithString:@""];
        cell.identifier = ident;
        cell.drawsBackground = NO;
    }
    cell.font = [NSFont monospacedDigitSystemFontOfSize:12 weight:NSFontWeightRegular];
    cell.textColor = [NSColor colorWithWhite:0.8 alpha:1];

    /* Find column index */
    NSArray *cols = tv.tableColumns;
    int ci = 0;
    for (NSTableColumn *c in cols) { if ([c.identifier isEqualToString:ident]) break; ci++; }

    if (_cell_fn) {
        const char *val = _cell_fn((int)row, ci, _cell_ctx);
        cell.stringValue = val ? [NSString stringWithUTF8String:val] : @"";
    }
    return cell;
}
@end

/* ─── Search Field Delegate ──────────────────────────────────────── */

@interface UISearchDelegate : NSObject <NSSearchFieldDelegate>
@property (nonatomic) UITextChangedFn callback;
@end

@implementation UISearchDelegate
- (void)controlTextDidChange:(NSNotification *)n {
    NSSearchField *f = n.object;
    if (_callback) _callback(f.stringValue.UTF8String);
}
@end

/* ─── Global State ───────────────────────────────────────────────── */

static NSApplication *g_app;
static NSMutableArray *g_retained;  /* prevent ARC from releasing delegates etc. */

/* ─── API Implementation ─────────────────────────────────────────── */

void ui_init(void) {
    g_app = [NSApplication sharedApplication];
    g_app.activationPolicy = NSApplicationActivationPolicyRegular;
    g_retained = [NSMutableArray new];

    /* Menu bar */
    NSMenu *bar = [NSMenu new];
    NSMenuItem *item = [NSMenuItem new];
    [bar addItem:item];
    NSMenu *sub = [NSMenu new];
    [sub addItemWithTitle:@"Quit" action:@selector(terminate:) keyEquivalent:@"q"];
    item.submenu = sub;
    g_app.mainMenu = bar;
}

void ui_run(UIHandle root) {
    NSWindow *win = (__bridge NSWindow *)root;
    [win makeKeyAndOrderFront:nil];
    [g_app activateIgnoringOtherApps:YES];
    [g_app run];
}

UIHandle ui_window(const char *title, int w, int h, bool dark) {
    NSWindow *win = [[NSWindow alloc] initWithContentRect:NSMakeRect(200, 100, w, h)
        styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable |
                  NSWindowStyleMaskResizable | NSWindowStyleMaskMiniaturizable |
                  NSWindowStyleMaskFullSizeContentView
        backing:NSBackingStoreBuffered defer:NO];
    win.title = [NSString stringWithUTF8String:title];
    win.titlebarAppearsTransparent = YES;
    win.minSize = NSMakeSize(600, 400);
    if (dark) {
        win.appearance = [NSAppearance appearanceNamed:NSAppearanceNameDarkAqua];
        win.backgroundColor = [NSColor colorWithWhite:0.06 alpha:1];
    }

    /* Root stack fills the window */
    UIStackContainer *root = [UIStackContainer new];
    root.direction = 0;
    root.flex = 1;
    root.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    root.frame = win.contentView.bounds;
    win.contentView = root;

    [g_retained addObject:win];
    return (__bridge UIHandle)win;
}

void ui_window_subtitle(UIHandle w, const char *sub) {
    NSWindow *win = (__bridge NSWindow *)w;
    win.subtitle = [NSString stringWithUTF8String:sub];
}

void ui_window_toolbar(UIHandle w, bool visible) { /* placeholder */ }
void ui_window_titlebar_transparent(UIHandle w) {
    ((__bridge NSWindow *)w).titlebarAppearsTransparent = YES;
}
void ui_window_fullsize_content(UIHandle w) { /* already set */ }

/* ─── Layout ─────────────────────────────────────────────────────── */

UIHandle ui_vstack(void) {
    UIStackContainer *s = [UIStackContainer new];
    s.direction = 0;
    [g_retained addObject:s];
    return (__bridge UIHandle)s;
}

UIHandle ui_hstack(void) {
    UIStackContainer *s = [UIStackContainer new];
    s.direction = 1;
    [g_retained addObject:s];
    return (__bridge UIHandle)s;
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
    if ([(__bridge NSView *)v isKindOfClass:[UIStackContainer class]]) {
        UIStackContainer *s = (__bridge UIStackContainer *)v;
        s.fixed_width = w; s.fixed_height = h;
    }
}

void ui_set_min_size(UIHandle v, int w, int h) { /* placeholder */ }
void ui_set_max_size(UIHandle v, int w, int h) { /* placeholder */ }
void ui_set_alignment(UIHandle v, int a) { /* placeholder */ }

void ui_add_child(UIHandle parent, UIHandle child) {
    NSView *p = (__bridge NSView *)parent;
    NSView *c = (__bridge NSView *)child;

    /* If parent is a window, add to its content view */
    if ([p isKindOfClass:[NSWindow class]]) {
        p = ((NSWindow *)p).contentView;
    }

    if ([p isKindOfClass:[UIStackContainer class]]) {
        [((UIStackContainer *)p).children addObject:c];
        [p addSubview:c];
    } else if ([p isKindOfClass:[NSScrollView class]]) {
        /* Scroll view: set as document view */
        if ([c isKindOfClass:[NSTableView class]]) {
            ((NSScrollView *)p).documentView = c;
        } else {
            [p addSubview:c];
        }
    } else {
        [p addSubview:c];
    }
}

UIHandle ui_spacer(void) {
    UISpacer *s = [UISpacer new];
    [g_retained addObject:s];
    return (__bridge UIHandle)s;
}

UIHandle ui_divider(void) {
    NSBox *box = [NSBox new];
    box.boxType = NSBoxSeparator;
    [g_retained addObject:box];
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
    [g_retained addObject:vev];
    return (__bridge UIHandle)vev;
}

/* ─── Text ───────────────────────────────────────────────────────── */

UIHandle ui_text(const char *content, int size, bool bold) {
    NSTextField *t = [NSTextField labelWithString:[NSString stringWithUTF8String:content]];
    t.font = [NSFont systemFontOfSize:size weight:bold ? NSFontWeightBold : NSFontWeightRegular];
    t.textColor = [NSColor colorWithWhite:0.9 alpha:1];
    t.drawsBackground = NO;
    [g_retained addObject:t];
    return (__bridge UIHandle)t;
}

UIHandle ui_text_mono(const char *content, int size, bool bold) {
    NSTextField *t = [NSTextField labelWithString:[NSString stringWithUTF8String:content]];
    t.font = [NSFont monospacedDigitSystemFontOfSize:size weight:bold ? NSFontWeightBold : NSFontWeightRegular];
    t.textColor = [NSColor colorWithWhite:0.9 alpha:1];
    t.drawsBackground = NO;
    [g_retained addObject:t];
    return (__bridge UIHandle)t;
}

void ui_text_set_color_rgb(UIHandle t, double r, double g, double b, double a) {
    if ([(__bridge NSView *)t isKindOfClass:[NSTextField class]])
        ((NSTextField *)(__bridge NSView *)t).textColor = [NSColor colorWithRed:r green:g blue:b alpha:a];
}

void ui_text_set_color_system(UIHandle t, int c) {
    if ([(__bridge NSView *)t isKindOfClass:[NSTextField class]])
        ((NSTextField *)(__bridge NSView *)t).textColor = system_color(c);
}

void ui_text_set_selectable(UIHandle t, bool sel) {
    if ([(__bridge NSView *)t isKindOfClass:[NSTextField class]])
        ((NSTextField *)(__bridge NSView *)t).selectable = sel;
}

UIHandle ui_label(const char *content) {
    UIHandle h = ui_text(content, 11, false);
    ui_text_set_color_system(h, 2);
    return h;
}

/* ─── SF Symbols ─────────────────────────────────────────────────── */

UIHandle ui_symbol(const char *name, int size) {
    NSString *n = [NSString stringWithUTF8String:name];
    NSImage *img = [NSImage imageWithSystemSymbolName:n accessibilityDescription:n];
    NSImageView *iv = [NSImageView imageViewWithImage:img];
    iv.symbolConfiguration = [NSImageSymbolConfiguration configurationWithPointSize:size weight:NSFontWeightMedium];
    iv.contentTintColor = [NSColor colorWithWhite:0.7 alpha:1];
    [g_retained addObject:iv];
    return (__bridge UIHandle)iv;
}

void ui_symbol_set_color(UIHandle s, int c) {
    if ([(__bridge NSView *)s isKindOfClass:[NSImageView class]])
        ((NSImageView *)(__bridge NSView *)s).contentTintColor = system_color(c);
}

/* ─── Search Field ───────────────────────────────────────────────── */

UIHandle ui_search_field(const char *placeholder) {
    NSSearchField *f = [[NSSearchField alloc] initWithFrame:NSMakeRect(0, 0, 300, 28)];
    f.placeholderString = [NSString stringWithUTF8String:placeholder];
    f.appearance = [NSAppearance appearanceNamed:NSAppearanceNameDarkAqua];
    [g_retained addObject:f];
    return (__bridge UIHandle)f;
}

UIHandle ui_text_field(const char *placeholder) {
    NSTextField *f = [[NSTextField alloc] initWithFrame:NSMakeRect(0, 0, 200, 24)];
    f.placeholderString = [NSString stringWithUTF8String:placeholder];
    f.drawsBackground = NO;
    f.bordered = YES;
    f.bezelStyle = NSTextFieldRoundedBezel;
    [g_retained addObject:f];
    return (__bridge UIHandle)f;
}

void ui_on_text_changed(UIHandle field, UITextChangedFn fn) {
    UISearchDelegate *d = [UISearchDelegate new];
    d.callback = fn;
    [g_retained addObject:d];
    if ([(__bridge NSView *)field isKindOfClass:[NSSearchField class]])
        ((NSSearchField *)(__bridge NSView *)field).delegate = d;
    else if ([(__bridge NSView *)field isKindOfClass:[NSTextField class]])
        /* TODO: NSTextField delegate */;
}

/* ─── Button ─────────────────────────────────────────────────────── */

@interface UIButtonTarget : NSObject
@property (nonatomic) UIClickFn fn;
@property (nonatomic) int tag;
@end
@implementation UIButtonTarget
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
        [g_retained addObject:t];
    }
    [g_retained addObject:b];
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
        [g_retained addObject:t];
    }
    [g_retained addObject:b];
    return (__bridge UIHandle)b;
}

void ui_button_set_style(UIHandle b, int style) {
    NSButton *btn = (__bridge NSButton *)b;
    if (![btn isKindOfClass:[NSButton class]]) return;
    switch (style) {
        case 1: btn.bezelStyle = NSBezelStylePush; btn.bezelColor = NSColor.controlAccentColor; break;
        case 2: btn.contentTintColor = NSColor.systemRedColor; break;
        case 3: btn.bordered = NO; break;
    }
}

/* ─── Segmented Control ──────────────────────────────────────────── */
UIHandle ui_segmented(int count, const char **labels) {
    NSMutableArray *arr = [NSMutableArray new];
    for (int i = 0; i < count; i++) [arr addObject:[NSString stringWithUTF8String:labels[i]]];
    NSSegmentedControl *sc = [NSSegmentedControl segmentedControlWithLabels:arr
        trackingMode:NSSegmentSwitchTrackingSelectOne target:nil action:nil];
    sc.selectedSegment = 0;
    [g_retained addObject:sc];
    return (__bridge UIHandle)sc;
}

void ui_segmented_on_change(UIHandle seg, UISegmentFn fn) { /* TODO */ }

/* ─── Toggle ─────────────────────────────────────────────────────── */
UIHandle ui_toggle(const char *label, bool initial) {
    NSSwitch *sw = [NSSwitch new];
    sw.state = initial ? NSControlStateValueOn : NSControlStateValueOff;
    [g_retained addObject:sw];
    return (__bridge UIHandle)sw;
}
void ui_toggle_on_change(UIHandle tog, UIToggleFn fn) { /* TODO */ }

/* ─── Progress ───────────────────────────────────────────────────── */
UIHandle ui_progress(double value) {
    NSProgressIndicator *pi = [NSProgressIndicator new];
    pi.style = NSProgressIndicatorStyleBar;
    pi.minValue = 0; pi.maxValue = 1;
    if (value < 0) { pi.indeterminate = YES; [pi startAnimation:nil]; }
    else { pi.indeterminate = NO; pi.doubleValue = value; }
    [g_retained addObject:pi];
    return (__bridge UIHandle)pi;
}

void ui_progress_set(UIHandle p, double value) {
    NSProgressIndicator *pi = (__bridge NSProgressIndicator *)p;
    if ([pi isKindOfClass:[NSProgressIndicator class]]) pi.doubleValue = value;
}

/* ─── Badge ──────────────────────────────────────────────────────── */
UIHandle ui_badge(const char *text, int sc) {
    NSTextField *t = [NSTextField labelWithString:[NSString stringWithUTF8String:text]];
    t.font = [NSFont systemFontOfSize:10 weight:NSFontWeightBold];
    t.textColor = [NSColor whiteColor];
    t.drawsBackground = YES;
    t.backgroundColor = system_color(sc);
    t.alignment = NSTextAlignmentCenter;
    t.wantsLayer = YES;
    t.layer.cornerRadius = 8;
    t.layer.masksToBounds = YES;
    [g_retained addObject:t];
    return (__bridge UIHandle)t;
}

/* ─── Card ───────────────────────────────────────────────────────── */
UIHandle ui_card(void) {
    UIStackContainer *c = [UIStackContainer new];
    c.direction = 0;
    c.wantsLayer = YES;
    c.layer.backgroundColor = [NSColor colorWithWhite:0.12 alpha:1].CGColor;
    c.layer.cornerRadius = 12;
    c.padding_top = 12; c.padding_right = 12; c.padding_bottom = 12; c.padding_left = 12;
    [g_retained addObject:c];
    return (__bridge UIHandle)c;
}

void ui_card_set_color(UIHandle c, double r, double g, double b, double a) {
    NSView *v = (__bridge NSView *)c;
    v.wantsLayer = YES;
    v.layer.backgroundColor = [NSColor colorWithRed:r green:g blue:b alpha:a].CGColor;
}

/* ─── Stat Card ──────────────────────────────────────────────────── */
UIHandle ui_stat(const char *value, const char *label, int sc) {
    UIStatView *sv = [UIStatView new];
    sv.value_text = [NSString stringWithUTF8String:value];
    sv.label_text = [NSString stringWithUTF8String:label];
    sv.accent = system_color(sc);
    [g_retained addObject:sv];
    return (__bridge UIHandle)sv;
}

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

    [g_retained addObject:vev];
    [g_retained addObject:s];
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

/* ─── Data Table ─────────────────────────────────────────────────── */

UIHandle ui_data_table(void) {
    NSScrollView *sv = [[NSScrollView alloc] init];
    sv.hasVerticalScroller = YES;
    sv.drawsBackground = NO;
    sv.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;

    NSTableView *tv = [[NSTableView alloc] init];
    tv.backgroundColor = [NSColor clearColor];
    tv.rowHeight = 24;
    tv.gridStyleMask = NSTableViewSolidHorizontalGridLineMask;
    tv.gridColor = [NSColor colorWithWhite:0.15 alpha:1];
    tv.intercellSpacing = NSMakeSize(8, 3);
    tv.usesAlternatingRowBackgroundColors = NO;

    UITableManager *mgr = [UITableManager new];
    mgr.table = tv;
    tv.dataSource = mgr;
    tv.delegate = mgr;
    [g_retained addObject:mgr];

    sv.documentView = tv;
    tv.tag = (NSInteger)(__bridge void *)mgr;  /* stash manager ref */

    [g_retained addObject:sv];
    [g_retained addObject:tv];
    return (__bridge UIHandle)sv;
}

void ui_data_table_add_column(UIHandle tbl, const char *id, const char *title, int width) {
    NSScrollView *sv = (__bridge NSScrollView *)tbl;
    NSTableView *tv = sv.documentView;
    NSTableColumn *col = [[NSTableColumn alloc] initWithIdentifier:[NSString stringWithUTF8String:id]];
    col.title = [NSString stringWithUTF8String:title];
    col.width = width;
    col.headerCell.textColor = [NSColor colorWithWhite:0.5 alpha:1];
    [tv addTableColumn:col];
}

void ui_data_table_set_data(UIHandle tbl, int rows, UITableCellFn fn, void *ctx) {
    NSScrollView *sv = (__bridge NSScrollView *)tbl;
    NSTableView *tv = sv.documentView;
    UITableManager *mgr = (__bridge UITableManager *)(void *)tv.tag;
    mgr.row_count = rows;
    mgr.cell_fn = fn;
    mgr.cell_ctx = ctx;
    [tv reloadData];
}

void ui_data_table_set_row_height(UIHandle tbl, int h) {
    NSScrollView *sv = (__bridge NSScrollView *)tbl;
    ((NSTableView *)sv.documentView).rowHeight = h;
}

void ui_data_table_set_alternating(UIHandle tbl, bool alt) {
    NSScrollView *sv = (__bridge NSScrollView *)tbl;
    ((NSTableView *)sv.documentView).usesAlternatingRowBackgroundColors = alt;
}

/* ─── Bar Chart ──────────────────────────────────────────────────── */

UIHandle ui_bar_chart(int height) {
    UIBarChartView *c = [UIBarChartView new];
    c.fixed_height = height;
    c.bar_count = 0;
    [g_retained addObject:c];
    return (__bridge UIHandle)c;
}

void ui_bar_chart_add(UIHandle chart, const char *label, double value, int sc) {
    UIBarChartView *c = (__bridge UIBarChartView *)chart;
    if (c.bar_count >= 32) return;
    BarData *b = &c->_bars[c.bar_count];
    strncpy(b->label, label, 63);
    b->value = value;
    b->color = system_color(sc);
    c.bar_count++;
}

void ui_bar_chart_set_title(UIHandle chart, const char *title) {
    ((UIBarChartView *)(__bridge NSView *)chart).chart_title = [NSString stringWithUTF8String:title];
}

/* ─── Sparkline ──────────────────────────────────────────────────── */
UIHandle ui_sparkline(int w, int h) { return ui_bar_chart(h); /* placeholder */ }
void ui_sparkline_set_values(UIHandle s, double *v, int c, int sc) { /* TODO */ }

/* ─── Scroll View ────────────────────────────────────────────────── */
UIHandle ui_scroll(void) {
    NSScrollView *sv = [NSScrollView new];
    sv.hasVerticalScroller = YES;
    sv.drawsBackground = NO;
    [g_retained addObject:sv];
    return (__bridge UIHandle)sv;
}

/* ─── Tab View ───────────────────────────────────────────────────── */
UIHandle ui_tab_view(void) { return ui_vstack(); /* placeholder */ }
UIHandle ui_tab(UIHandle tv, const char *l, const char *s) { return ui_vstack(); }

/* ─── Popover ────────────────────────────────────────────────────── */
void ui_show_popover(UIHandle anchor, UIHandle content, int w, int h) { /* TODO */ }

/* ─── Alert ──────────────────────────────────────────────────────── */
void ui_alert(const char *title, const char *msg, const char *btn) {
    NSAlert *a = [NSAlert new];
    a.messageText = [NSString stringWithUTF8String:title];
    a.informativeText = [NSString stringWithUTF8String:msg];
    [a addButtonWithTitle:[NSString stringWithUTF8String:btn]];
    [a runModal];
}

/* ─── Background / Styling ───────────────────────────────────────── */

void ui_set_background_rgb(UIHandle v, double r, double g, double b, double a) {
    NSView *view = (__bridge NSView *)v;
    view.wantsLayer = YES;
    view.layer.backgroundColor = [NSColor colorWithRed:r green:g blue:b alpha:a].CGColor;
}

void ui_set_background_system(UIHandle v, int c) {
    NSView *view = (__bridge NSView *)v;
    view.wantsLayer = YES;
    view.layer.backgroundColor = system_color(c).CGColor;
}

void ui_set_corner_radius(UIHandle v, double r) {
    NSView *view = (__bridge NSView *)v;
    view.wantsLayer = YES;
    view.layer.cornerRadius = r;
    view.layer.masksToBounds = YES;
}

void ui_set_border(UIHandle v, double r, double g, double b, double w) {
    NSView *view = (__bridge NSView *)v;
    view.wantsLayer = YES;
    view.layer.borderColor = [NSColor colorWithRed:r green:g blue:b alpha:1].CGColor;
    view.layer.borderWidth = w;
}

/* ─── Animation ──────────────────────────────────────────────────── */
void ui_animate(UIHandle v, double duration) {
    [NSAnimationContext currentContext].duration = duration;
    [NSAnimationContext currentContext].allowsImplicitAnimation = YES;
}

/* ─── Timer ──────────────────────────────────────────────────────── */
@interface UITimerTarget : NSObject
@property (nonatomic) UITimerFn fn;
@end
@implementation UITimerTarget
- (void)fire:(NSTimer *)t { if (_fn) _fn(); }
@end

void ui_set_timer(double interval, UITimerFn fn) {
    UITimerTarget *t = [UITimerTarget new];
    t.fn = fn;
    [g_retained addObject:t];
    [NSTimer scheduledTimerWithTimeInterval:interval target:t
        selector:@selector(fire:) userInfo:nil repeats:YES];
}
