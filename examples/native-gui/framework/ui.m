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
#include "runtime.h"

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

static inline void retain_render(id obj);
static inline void retain_persistent(id obj);
static void finish_render_cycle(void);

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
static NSMutableArray *g_render_retained;      /* bridge ARC until views join the live hierarchy */
static NSMutableArray *g_persistent_retained;  /* delegates, timers, callback targets */
static NSWindow *g_root_window = nil;

static inline void retain_render(id obj) {
    if (obj) [g_render_retained addObject:obj];
}

static inline void retain_persistent(id obj) {
    if (obj) [g_persistent_retained addObject:obj];
}

static void finish_render_cycle(void) {
    [g_render_retained removeAllObjects];
}
static NSMutableDictionary *g_element_ids;  /* element_id → NSView for inspector lookup */

/* ─── API Implementation ─────────────────────────────────────────── */

/* ─── Error Overlay (Next.js-style) ─────────────────────────────── */

static void ts_error_overlay(const char *title, const char *message,
                              const char *file, int line,
                              const char *stack_trace) {
    /* Must run on main thread for UI work */
    void (^show_overlay)(void) = ^{
        /* Find the app window */
        NSWindow *win = nil;
        for (NSWindow *w in [NSApp windows]) {
            if (w.isVisible && !w.isMiniaturized) { win = w; break; }
        }
        if (!win) return;

        NSView *content = win.contentView;
        NSRect bounds = content.bounds;

        /* ─── Red overlay container ─────────────────────────────── */
        NSView *overlay = [[NSView alloc] initWithFrame:bounds];
        overlay.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
        overlay.wantsLayer = YES;
        overlay.layer.backgroundColor = [NSColor colorWithRed:0.12 green:0.02 blue:0.02 alpha:0.97].CGColor;

        /* ─── Inner content (inset from edges) ──────────────────── */
        CGFloat pad = 40;
        CGFloat y = bounds.size.height - pad;

        /* Error icon + title */
        NSTextField *icon_label = [NSTextField labelWithString:@"⛔"];
        icon_label.font = [NSFont systemFontOfSize:28];
        icon_label.frame = NSMakeRect(pad, y - 36, 40, 36);
        [overlay addSubview:icon_label];

        NSTextField *title_label = [NSTextField labelWithString:
            [NSString stringWithUTF8String:title]];
        title_label.font = [NSFont boldSystemFontOfSize:22];
        title_label.textColor = [NSColor colorWithRed:1.0 green:0.3 blue:0.3 alpha:1.0];
        title_label.frame = NSMakeRect(pad + 44, y - 34, bounds.size.width - 2*pad - 44, 30);
        [overlay addSubview:title_label];
        y -= 50;

        /* Horizontal rule */
        NSView *rule = [[NSView alloc] initWithFrame:NSMakeRect(pad, y, bounds.size.width - 2*pad, 1)];
        rule.wantsLayer = YES;
        rule.layer.backgroundColor = [NSColor colorWithRed:0.4 green:0.15 blue:0.15 alpha:1.0].CGColor;
        [overlay addSubview:rule];
        y -= 24;

        /* File:line badge */
        if (file && file[0]) {
            /* Extract just filename from full path */
            const char *basename = file;
            const char *slash = strrchr(file, '/');
            if (slash) basename = slash + 1;

            NSString *loc = line > 0
                ? [NSString stringWithFormat:@"  %s:%d  ", basename, line]
                : [NSString stringWithFormat:@"  %s  ", basename];

            NSTextField *loc_label = [NSTextField labelWithString:loc];
            loc_label.font = [NSFont monospacedSystemFontOfSize:13 weight:NSFontWeightMedium];
            loc_label.textColor = [NSColor whiteColor];
            loc_label.wantsLayer = YES;
            loc_label.layer.backgroundColor = [NSColor colorWithRed:0.6 green:0.1 blue:0.1 alpha:1.0].CGColor;
            loc_label.layer.cornerRadius = 4;
            [loc_label sizeToFit];
            NSRect lf = loc_label.frame;
            lf.origin = NSMakePoint(pad, y - lf.size.height);
            loc_label.frame = lf;
            [overlay addSubview:loc_label];
            y -= lf.size.height + 16;

            /* Full file path (dimmed) */
            NSTextField *path_label = [NSTextField labelWithString:
                [NSString stringWithUTF8String:file]];
            path_label.font = [NSFont monospacedSystemFontOfSize:11 weight:NSFontWeightRegular];
            path_label.textColor = [NSColor colorWithRed:0.6 green:0.4 blue:0.4 alpha:1.0];
            path_label.frame = NSMakeRect(pad, y - 16, bounds.size.width - 2*pad, 16);
            [overlay addSubview:path_label];
            y -= 28;
        }

        /* Error message */
        if (message && message[0]) {
            NSTextField *msg = [NSTextField labelWithString:
                [NSString stringWithUTF8String:message]];
            msg.font = [NSFont monospacedSystemFontOfSize:14 weight:NSFontWeightRegular];
            msg.textColor = [NSColor colorWithRed:1.0 green:0.85 blue:0.85 alpha:1.0];
            msg.maximumNumberOfLines = 0;
            msg.lineBreakMode = NSLineBreakByWordWrapping;
            msg.preferredMaxLayoutWidth = bounds.size.width - 2*pad;
            [msg sizeToFit];
            NSRect mf = msg.frame;
            mf.origin = NSMakePoint(pad, y - mf.size.height);
            mf.size.width = bounds.size.width - 2*pad;
            msg.frame = mf;
            [overlay addSubview:msg];
            y -= mf.size.height + 20;
        }

        /* Stack trace (if provided, different from message) */
        if (stack_trace && stack_trace[0] && (!message || strcmp(stack_trace, message) != 0)) {
            NSView *stack_rule = [[NSView alloc] initWithFrame:NSMakeRect(pad, y, bounds.size.width - 2*pad, 1)];
            stack_rule.wantsLayer = YES;
            stack_rule.layer.backgroundColor = [NSColor colorWithRed:0.3 green:0.1 blue:0.1 alpha:1.0].CGColor;
            [overlay addSubview:stack_rule];
            y -= 16;

            NSTextField *stack_title = [NSTextField labelWithString:@"Stack Trace"];
            stack_title.font = [NSFont boldSystemFontOfSize:12];
            stack_title.textColor = [NSColor colorWithRed:0.7 green:0.4 blue:0.4 alpha:1.0];
            stack_title.frame = NSMakeRect(pad, y - 16, 200, 16);
            [overlay addSubview:stack_title];
            y -= 24;

            NSTextField *stack = [NSTextField labelWithString:
                [NSString stringWithUTF8String:stack_trace]];
            stack.font = [NSFont monospacedSystemFontOfSize:11 weight:NSFontWeightRegular];
            stack.textColor = [NSColor colorWithRed:0.8 green:0.6 blue:0.6 alpha:1.0];
            stack.maximumNumberOfLines = 0;
            stack.lineBreakMode = NSLineBreakByCharWrapping;
            stack.preferredMaxLayoutWidth = bounds.size.width - 2*pad;
            [stack sizeToFit];
            NSRect sf = stack.frame;
            sf.origin = NSMakePoint(pad, y - sf.size.height);
            sf.size.width = bounds.size.width - 2*pad;
            stack.frame = sf;
            [overlay addSubview:stack];
        }

        /* ─── "StrictTS" watermark ──────────────────────────────── */
        NSTextField *watermark = [NSTextField labelWithString:@"StrictTS Error Overlay  ·  Debug Build"];
        watermark.font = [NSFont systemFontOfSize:10 weight:NSFontWeightMedium];
        watermark.textColor = [NSColor colorWithRed:0.5 green:0.25 blue:0.25 alpha:1.0];
        watermark.frame = NSMakeRect(pad, 12, bounds.size.width - 2*pad, 14);
        [overlay addSubview:watermark];

        /* Add overlay on top of everything */
        [content addSubview:overlay positioned:NSWindowAbove relativeTo:nil];
        [content setNeedsDisplay:YES];
        [content displayIfNeeded];
        [win display];

        /* Force a run loop tick so the window actually redraws */
        [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode
            beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];

        /* Auto-save screenshot of the error overlay */
        NSBitmapImageRep *rep = [content bitmapImageRepForCachingDisplayInRect:content.bounds];
        [content cacheDisplayInRect:content.bounds toBitmapImageRep:rep];
        NSData *png = [rep representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
        [png writeToFile:@"/tmp/strictts-error.png" atomically:YES];
        fprintf(stderr, "\n  \033[90mError screenshot: /tmp/strictts-error.png\033[0m\n\n");
    };

    /* Execute on main thread — might be called from signal handler */
    if ([NSThread isMainThread]) {
        show_overlay();
    } else {
        dispatch_sync(dispatch_get_main_queue(), show_overlay);
    }

    /* Keep the app alive so the user can see the overlay.
     * Run the event loop for up to 30 seconds — user can Cmd+Q to exit sooner.
     * After this returns, abort()/crash will proceed. */
    if ([NSThread isMainThread]) {
        NSDate *deadline = [NSDate dateWithTimeIntervalSinceNow:30];
        while ([[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:deadline]) {
            /* Check if window was closed */
            BOOL any_visible = NO;
            for (NSWindow *w in [NSApp windows]) {
                if (w.isVisible) { any_visible = YES; break; }
            }
            if (!any_visible) break;
        }
    }
}

void ui_init(void) {
    g_app = [NSApplication sharedApplication];
    g_app.activationPolicy = NSApplicationActivationPolicyRegular;
    g_render_retained = [NSMutableArray new];
    g_persistent_retained = [NSMutableArray new];
    g_element_ids = [NSMutableDictionary new];

    /* Register error overlay callback so runtime errors show in-app */
    ts_set_error_overlay(ts_error_overlay);

    /* Menu bar */
    NSMenu *bar = [NSMenu new];
    NSMenuItem *item = [NSMenuItem new];
    [bar addItem:item];
    NSMenu *sub = [NSMenu new];
    [sub addItemWithTitle:@"Quit" action:@selector(terminate:) keyEquivalent:@"q"];
    item.submenu = sub;
    g_app.mainMenu = bar;
}

/* Forward declarations for inspector */
static NSWindow *g_inspect_window;
void ui_inspector_start(void);

void ui_run(UIHandle root) {
    NSWindow *win = (__bridge NSWindow *)root;
    g_root_window = win;
    g_inspect_window = win;  /* capture for inspector */
    [win makeKeyAndOrderFront:nil];
    [g_app activateIgnoringOtherApps:YES];
    ui_inspector_start();
    finish_render_cycle();
    [g_app run];
}

void ui_replace_root(UIHandle root) {
    NSWindow *next = (__bridge NSWindow *)root;
    if (!g_root_window) {
        g_root_window = next;
        finish_render_cycle();
        return;
    }

    NSWindow *current = g_root_window;
    NSRect preservedFrame = current.frame;
    NSString *title = next.title ?: current.title;
    NSString *subtitle = next.subtitle ?: current.subtitle;
    NSAppearance *appearance = next.appearance ?: current.appearance;
    NSColor *background = next.backgroundColor ?: current.backgroundColor;
    NSView *replacement = next.contentView;

    replacement.frame = current.contentView.bounds;
    replacement.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    current.contentView = replacement;
    current.title = title;
    current.subtitle = subtitle;
    current.appearance = appearance;
    current.backgroundColor = background;
    [current setFrame:preservedFrame display:YES];
    [current makeKeyAndOrderFront:nil];
    g_inspect_window = current;

    [next orderOut:nil];
    [next close];
    finish_render_cycle();
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

    retain_render(win);
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
    retain_render(s);
    return (__bridge UIHandle)s;
}

UIHandle ui_hstack(void) {
    UIStackContainer *s = [UIStackContainer new];
    s.direction = 1;
    retain_render(s);
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

/* ─── Text ───────────────────────────────────────────────────────── */

UIHandle ui_text(const char *content, int size, bool bold) {
    NSTextField *t = [NSTextField labelWithString:[NSString stringWithUTF8String:content]];
    t.font = [NSFont systemFontOfSize:size weight:bold ? NSFontWeightBold : NSFontWeightRegular];
    t.textColor = [NSColor colorWithWhite:0.9 alpha:1];
    t.drawsBackground = NO;
    retain_render(t);
    return (__bridge UIHandle)t;
}

UIHandle ui_text_mono(const char *content, int size, bool bold) {
    NSTextField *t = [NSTextField labelWithString:[NSString stringWithUTF8String:content]];
    t.font = [NSFont monospacedDigitSystemFontOfSize:size weight:bold ? NSFontWeightBold : NSFontWeightRegular];
    t.textColor = [NSColor colorWithWhite:0.9 alpha:1];
    t.drawsBackground = NO;
    retain_render(t);
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
    retain_render(iv);
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
    retain_render(sc);
    return (__bridge UIHandle)sc;
}

void ui_segmented_on_change(UIHandle seg, UISegmentFn fn) { /* TODO */ }

/* ─── Toggle ─────────────────────────────────────────────────────── */
UIHandle ui_toggle(const char *label, bool initial) {
    NSSwitch *sw = [NSSwitch new];
    sw.state = initial ? NSControlStateValueOn : NSControlStateValueOff;
    retain_render(sw);
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
    retain_render(pi);
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
    retain_render(t);
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
    retain_render(c);
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
    retain_render(sv);
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
    retain_persistent(mgr);

    sv.documentView = tv;
    tv.tag = (NSInteger)(__bridge void *)mgr;  /* stash manager ref */

    retain_render(sv);
    retain_render(tv);
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
    retain_render(c);
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
    retain_render(sv);
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
    retain_persistent(t);
    [NSTimer scheduledTimerWithTimeInterval:interval target:t
        selector:@selector(fire:) userInfo:nil repeats:YES];
}

/* ─── Inspector (Dev Tools) ──────────────────────────────────────── */

#include <sys/socket.h>
#include <sys/un.h>

#define INSPECT_SOCK "/tmp/strictts-inspect.sock"

static NSWindow *g_inspect_window = nil;

/* Recursively dump view tree */
static void dump_tree(NSView *view, int depth, NSMutableString *out) {
    NSString *indent = [@"" stringByPaddingToLength:depth * 2 withString:@" " startingAtIndex:0];
    NSRect f = view.frame;
    NSString *type = NSStringFromClass([view class]);

    /* Simplify type names */
    if ([view isKindOfClass:[UIStackContainer class]]) {
        UIStackContainer *sc = (UIStackContainer *)view;
        type = sc.direction == 0 ? @"VStack" : @"HStack";
        NSString *extra = @"";
        if (sc.flex > 0) extra = [extra stringByAppendingFormat:@" flex=%d", sc.flex];
        if (sc.fixed_width > 0) extra = [extra stringByAppendingFormat:@" fw=%d", sc.fixed_width];
        if (sc.fixed_height > 0) extra = [extra stringByAppendingFormat:@" fh=%d", sc.fixed_height];
        [out appendFormat:@"%@%@ (%.0f×%.0f at %.0f,%.0f)%@\n", indent, type,
            f.size.width, f.size.height, f.origin.x, f.origin.y, extra];
    } else if ([view isKindOfClass:[NSTextField class]]) {
        NSString *text = ((NSTextField *)view).stringValue;
        if (text.length > 40) text = [[text substringToIndex:40] stringByAppendingString:@"…"];
        [out appendFormat:@"%@Text \"%@\" (%.0f×%.0f at %.0f,%.0f)\n", indent, text,
            f.size.width, f.size.height, f.origin.x, f.origin.y];
    } else if ([view isKindOfClass:[NSSearchField class]]) {
        [out appendFormat:@"%@Search (%.0f×%.0f at %.0f,%.0f)\n", indent,
            f.size.width, f.size.height, f.origin.x, f.origin.y];
    } else if ([view isKindOfClass:[NSButton class]]) {
        NSString *title = ((NSButton *)view).title;
        [out appendFormat:@"%@Button \"%@\" (%.0f×%.0f at %.0f,%.0f)\n", indent, title,
            f.size.width, f.size.height, f.origin.x, f.origin.y];
    } else if ([view isKindOfClass:[UISpacer class]]) {
        [out appendFormat:@"%@Spacer (%.0f×%.0f)\n", indent, f.size.width, f.size.height];
    } else if ([view isKindOfClass:[NSScrollView class]]) {
        [out appendFormat:@"%@ScrollView (%.0f×%.0f at %.0f,%.0f)\n", indent,
            f.size.width, f.size.height, f.origin.x, f.origin.y];
    } else if ([view isKindOfClass:[NSVisualEffectView class]]) {
        [out appendFormat:@"%@BlurView (%.0f×%.0f at %.0f,%.0f)\n", indent,
            f.size.width, f.size.height, f.origin.x, f.origin.y];
    } else if ([view isKindOfClass:[UIBarChartView class]]) {
        [out appendFormat:@"%@BarChart (%.0f×%.0f at %.0f,%.0f)\n", indent,
            f.size.width, f.size.height, f.origin.x, f.origin.y];
    } else if ([view isKindOfClass:[UIStatView class]]) {
        UIStatView *sv = (UIStatView *)view;
        [out appendFormat:@"%@Stat \"%@\" (%.0f×%.0f at %.0f,%.0f)\n", indent, sv.value_text,
            f.size.width, f.size.height, f.origin.x, f.origin.y];
    } else {
        [out appendFormat:@"%@%@ (%.0f×%.0f at %.0f,%.0f)\n", indent, type,
            f.size.width, f.size.height, f.origin.x, f.origin.y];
    }

    /* Recurse into children */
    if ([view isKindOfClass:[UIStackContainer class]]) {
        for (NSView *child in ((UIStackContainer *)view).children) {
            dump_tree(child, depth + 1, out);
        }
    } else {
        for (NSView *sub in view.subviews) {
            dump_tree(sub, depth + 1, out);
        }
    }
}

/* Take a screenshot of the window */
static NSString *take_screenshot(void) {
    if (!g_inspect_window) return @"No window";
    NSString *path = @"/tmp/strictts-screenshot.png";

    /* Capture on main thread */
    dispatch_sync(dispatch_get_main_queue(), ^{
        NSView *contentView = g_inspect_window.contentView;
        NSBitmapImageRep *rep = [contentView bitmapImageRepForCachingDisplayInRect:contentView.bounds];
        [contentView cacheDisplayInRect:contentView.bounds toBitmapImageRep:rep];
        NSData *png = [rep representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
        [png writeToFile:path atomically:YES];
    });

    return [NSString stringWithFormat:@"Screenshot saved: %@", path];
}

/* Find and click a button by label */
static NSString *click_button(NSString *label, NSView *view) {
    if ([view isKindOfClass:[NSButton class]]) {
        NSButton *btn = (NSButton *)view;
        if ([btn.title containsString:label]) {
            dispatch_async(dispatch_get_main_queue(), ^{
                [btn performClick:nil];
            });
            return [NSString stringWithFormat:@"Clicked: %@", btn.title];
        }
    }
    if ([view isKindOfClass:[UIStackContainer class]]) {
        for (NSView *child in ((UIStackContainer *)view).children) {
            NSString *r = click_button(label, child);
            if (r) return r;
        }
    }
    for (NSView *sub in view.subviews) {
        NSString *r = click_button(label, sub);
        if (r) return r;
    }
    return nil;
}

/* Type text into the search field */
static NSString *type_text(NSString *text, NSView *view) {
    if ([view isKindOfClass:[NSSearchField class]]) {
        NSSearchField *f = (NSSearchField *)view;
        dispatch_async(dispatch_get_main_queue(), ^{
            f.stringValue = text;
            /* Trigger the delegate callback */
            NSNotification *n = [NSNotification notificationWithName:NSControlTextDidChangeNotification
                                                              object:f];
            if (f.delegate && [f.delegate respondsToSelector:@selector(controlTextDidChange:)])
                [f.delegate controlTextDidChange:n];
        });
        return [NSString stringWithFormat:@"Typed: %@", text];
    }
    if ([view isKindOfClass:[UIStackContainer class]]) {
        for (NSView *child in ((UIStackContainer *)view).children) {
            NSString *r = type_text(text, child);
            if (r) return r;
        }
    }
    for (NSView *sub in view.subviews) {
        NSString *r = type_text(text, sub);
        if (r) return r;
    }
    return nil;
}

/* Register element ID for inspector lookup */
void ui_set_id(UIHandle v, const char *element_id) {
    NSView *view = (__bridge NSView *)v;
    NSString *key = [NSString stringWithUTF8String:element_id];
    g_element_ids[key] = view;
}

/* Recursively find elements containing text */
static void find_text(NSView *view, NSString *query, int depth, NSMutableString *out) {
    NSString *indent = [@"" stringByPaddingToLength:depth * 2 withString:@" " startingAtIndex:0];
    NSRect f = view.frame;

    if ([view isKindOfClass:[NSTextField class]]) {
        NSString *text = ((NSTextField *)view).stringValue;
        if ([text localizedCaseInsensitiveContainsString:query]) {
            [out appendFormat:@"%@Text \"%@\" (%.0f×%.0f at %.0f,%.0f)\n", indent, text,
                f.size.width, f.size.height, f.origin.x, f.origin.y];
        }
    } else if ([view isKindOfClass:[NSButton class]]) {
        NSString *title = ((NSButton *)view).title;
        if ([title localizedCaseInsensitiveContainsString:query]) {
            [out appendFormat:@"%@Button \"%@\" (%.0f×%.0f at %.0f,%.0f)\n", indent, title,
                f.size.width, f.size.height, f.origin.x, f.origin.y];
        }
    } else if ([view isKindOfClass:[NSSearchField class]]) {
        NSString *text = ((NSSearchField *)view).stringValue;
        if ([text localizedCaseInsensitiveContainsString:query]) {
            [out appendFormat:@"%@Search \"%@\" (%.0f×%.0f at %.0f,%.0f)\n", indent, text,
                f.size.width, f.size.height, f.origin.x, f.origin.y];
        }
    }

    if ([view isKindOfClass:[UIStackContainer class]]) {
        for (NSView *child in ((UIStackContainer *)view).children) {
            find_text(child, query, depth + 1, out);
        }
    }
    for (NSView *sub in view.subviews) {
        find_text(sub, query, depth + 1, out);
    }
}

/* Get a property of a registered element */
static NSString *get_property(NSString *element_id, NSString *prop) {
    NSView *view = g_element_ids[element_id];
    if (!view) return [NSString stringWithFormat:@"Element not found: %@\n", element_id];

    if ([prop isEqualToString:@"frame"]) {
        NSRect f = view.frame;
        return [NSString stringWithFormat:@"%.0f×%.0f at %.0f,%.0f\n",
            f.size.width, f.size.height, f.origin.x, f.origin.y];
    }
    if ([prop isEqualToString:@"text"]) {
        if ([view isKindOfClass:[NSTextField class]])
            return [NSString stringWithFormat:@"%@\n", ((NSTextField *)view).stringValue];
        if ([view isKindOfClass:[NSButton class]])
            return [NSString stringWithFormat:@"%@\n", ((NSButton *)view).title];
        return @"(no text)\n";
    }
    if ([prop isEqualToString:@"hidden"]) {
        return view.isHidden ? @"true\n" : @"false\n";
    }
    if ([prop isEqualToString:@"children"]) {
        if ([view isKindOfClass:[UIStackContainer class]]) {
            int count = (int)((UIStackContainer *)view).children.count;
            return [NSString stringWithFormat:@"%d children\n", count];
        }
        return [NSString stringWithFormat:@"%d subviews\n", (int)view.subviews.count];
    }
    if ([prop isEqualToString:@"flex"]) {
        if ([view isKindOfClass:[UIStackContainer class]])
            return [NSString stringWithFormat:@"%d\n", ((UIStackContainer *)view).flex];
        return @"0\n";
    }
    if ([prop isEqualToString:@"type"]) {
        if ([view isKindOfClass:[UIStackContainer class]]) {
            UIStackContainer *sc = (UIStackContainer *)view;
            return [NSString stringWithFormat:@"%@\n", sc.direction == 0 ? @"VStack" : @"HStack"];
        }
        return [NSString stringWithFormat:@"%@\n", NSStringFromClass([view class])];
    }

    /* Default: dump all info */
    NSRect f = view.frame;
    NSString *type = NSStringFromClass([view class]);
    return [NSString stringWithFormat:@"%@ (%.0f×%.0f at %.0f,%.0f)\n", type,
        f.size.width, f.size.height, f.origin.x, f.origin.y];
}

/* Handle a command from the socket */
static NSString *handle_command(NSString *cmd) {
    cmd = [cmd stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];

    if ([cmd isEqualToString:@"tree"]) {
        if (!g_inspect_window) return @"No window\n";
        __block NSMutableString *out = [NSMutableString new];
        dispatch_sync(dispatch_get_main_queue(), ^{
            NSRect wf = g_inspect_window.frame;
            [out appendFormat:@"Window \"%@\" (%.0f×%.0f)\n",
                g_inspect_window.title, wf.size.width, wf.size.height];
            dump_tree(g_inspect_window.contentView, 1, out);
        });
        return out;
    }

    if ([cmd isEqualToString:@"screenshot"]) {
        return take_screenshot();
    }

    if ([cmd hasPrefix:@"click "]) {
        NSString *label = [cmd substringFromIndex:6];
        if (!g_inspect_window) return @"No window\n";
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            result = click_button(label, g_inspect_window.contentView);
        });
        return result ?: [NSString stringWithFormat:@"Button not found: %@", label];
    }

    if ([cmd hasPrefix:@"type "]) {
        NSString *text = [cmd substringFromIndex:5];
        if (!g_inspect_window) return @"No window\n";
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            result = type_text(text, g_inspect_window.contentView);
        });
        return result ?: @"No search field found";
    }

    if ([cmd hasPrefix:@"find "]) {
        NSString *query = [cmd substringFromIndex:5];
        if (!g_inspect_window) return @"No window\n";
        __block NSMutableString *out = [NSMutableString new];
        dispatch_sync(dispatch_get_main_queue(), ^{
            find_text(g_inspect_window.contentView, query, 0, out);
        });
        return out.length > 0 ? out : [NSString stringWithFormat:@"No matches for: %@\n", query];
    }

    if ([cmd hasPrefix:@"get "]) {
        NSString *args = [cmd substringFromIndex:4];
        NSArray *parts = [args componentsSeparatedByString:@" "];
        NSString *eid = parts[0];
        NSString *prop = parts.count > 1 ? parts[1] : @"frame";
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            result = get_property(eid, prop);
        });
        return result;
    }

    if ([cmd isEqualToString:@"help"]) {
        return @"Commands:\n  tree          — dump view hierarchy\n  screenshot    — save /tmp/strictts-screenshot.png\n  click <label> — click button containing label\n  type <text>   — type into search field\n  find <text>   — find elements containing text\n  get <id> [prop] — get element property (frame/text/hidden/children/flex/type)\n  help          — this message\n";
    }

    return [NSString stringWithFormat:@"Unknown command: %@\nType 'help' for usage.\n", cmd];
}

/* Socket listener on background thread */
void ui_inspector_start(void) {
    /* Store window ref for later */
    for (NSWindow *w in [NSApp windows]) {
        if (w.isVisible) { g_inspect_window = w; break; }
    }
    /* Also hook into ui_run to capture the window */

    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        unlink(INSPECT_SOCK);

        int fd = socket(AF_UNIX, SOCK_STREAM, 0);
        if (fd < 0) { perror("[inspector] socket"); return; }

        struct sockaddr_un addr;
        memset(&addr, 0, sizeof(addr));
        addr.sun_family = AF_UNIX;
        strncpy(addr.sun_path, INSPECT_SOCK, sizeof(addr.sun_path) - 1);

        if (bind(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) { perror("[inspector] bind"); close(fd); return; }
        if (listen(fd, 2) < 0) { perror("[inspector] listen"); close(fd); return; }

        fprintf(stderr, "[inspector] Listening on %s\n", INSPECT_SOCK);

        while (1) {
            int client = accept(fd, NULL, NULL);
            if (client < 0) continue;

            char buf[1024];
            ssize_t n = read(client, buf, sizeof(buf) - 1);
            if (n > 0) {
                buf[n] = 0;
                NSString *cmd = [NSString stringWithUTF8String:buf];
                NSString *resp = handle_command(cmd);
                const char *r = [resp UTF8String];
                write(client, r, strlen(r));
            }
            close(client);
        }
    });
}
