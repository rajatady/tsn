/*
 * StrictTS Native UI Runtime — AppKit implementation
 *
 * Every ui_* function creates real AppKit views.
 * TypeScript developers never see this file — they call typed functions,
 * the compiler emits C calls, this runtime does the rest.
 */

#import <Cocoa/Cocoa.h>
#import <QuartzCore/QuartzCore.h>
#import <objc/runtime.h>
#include <dlfcn.h>
#include "ui.h"
#include "runtime.h"
#include <yoga/Yoga.h>

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

typedef NS_ENUM(NSInteger, TSNTextRuntimeKind) {
    TSNTextRuntimeKindStatic = 0,
    TSNTextRuntimeKindInput = 1,
    TSNTextRuntimeKindSearch = 2,
};

typedef NS_ENUM(NSInteger, TSNTextRuntimeWrapMode) {
    TSNTextRuntimeWrapModeWrap = 0,
    TSNTextRuntimeWrapModeTruncate = 1,
    TSNTextRuntimeWrapModeClip = 2,
};

static char kTextRuntimeKindKey;
static char kTextRuntimeWrapModeKey;
static char kTextRuntimeMultilineKey;
static char kTextRuntimeLineHeightMultiplierKey;
static char kTextRuntimeMonospaceKey;

@class TSNTextLabelView;
static CGFloat tsn_text_resolved_line_height(NSView *view);
static NSAttributedString *tsn_text_attributed_string(NSView *view);
static NSSize tsn_text_bounding_size(NSView *view, CGFloat maxWidth);

@interface TSNTextLabelView : NSView
@property (nonatomic, copy) NSString *stringValue;
@property (nonatomic, strong) NSFont *font;
@property (nonatomic, strong) NSColor *textColor;
@property (nonatomic) NSTextAlignment alignment;
@property (nonatomic) CGFloat tracking;
@end

@implementation TSNTextLabelView
- (instancetype)initWithString:(NSString *)string {
    self = [super initWithFrame:NSZeroRect];
    if (!self) return nil;
    _stringValue = [string copy] ?: @"";
    _font = [NSFont systemFontOfSize:14 weight:NSFontWeightRegular];
    _textColor = [NSColor colorWithWhite:0.9 alpha:1];
    _alignment = NSTextAlignmentLeft;
    _tracking = 0;
    return self;
}
- (BOOL)isFlipped { return YES; }
- (void)setStringValue:(NSString *)stringValue {
    _stringValue = [stringValue copy] ?: @"";
    [self invalidateIntrinsicContentSize];
    [self setNeedsDisplay:YES];
}
- (void)setFont:(NSFont *)font {
    _font = font ?: [NSFont systemFontOfSize:14 weight:NSFontWeightRegular];
    [self invalidateIntrinsicContentSize];
    [self setNeedsDisplay:YES];
}
- (void)setTextColor:(NSColor *)textColor {
    _textColor = textColor ?: [NSColor colorWithWhite:0.9 alpha:1];
    [self setNeedsDisplay:YES];
}
- (void)setAlignment:(NSTextAlignment)alignment {
    _alignment = alignment;
    [self setNeedsDisplay:YES];
}
- (void)setTracking:(CGFloat)tracking {
    _tracking = tracking;
    [self invalidateIntrinsicContentSize];
    [self setNeedsDisplay:YES];
}
- (NSSize)intrinsicContentSize {
    return tsn_text_bounding_size(self, CGFLOAT_MAX);
}
- (void)drawRect:(NSRect)dirtyRect {
    [super drawRect:dirtyRect];
    NSAttributedString *attr = tsn_text_attributed_string(self);
    if (attr.length == 0) return;
    NSStringDrawingOptions options = NSStringDrawingUsesLineFragmentOrigin | NSStringDrawingUsesFontLeading;
    [attr drawWithRect:self.bounds options:options];
}
@end

static CGFloat tsn_default_css_line_height_for_size(CGFloat fontSize) {
    if (fontSize <= 12) return 16;
    if (fontSize <= 14) return 20;
    if (fontSize <= 16) return 24;
    if (fontSize <= 20) return 28;
    if (fontSize <= 24) return 32;
    if (fontSize <= 30) return 36;
    if (fontSize <= 36) return 40;
    return fontSize * 1.2;
}

static NSFont *tsn_browser_text_font(CGFloat size, CGFloat weight, BOOL monospace) {
    if (monospace) return [NSFont monospacedSystemFontOfSize:size weight:weight];
    return [NSFont systemFontOfSize:size weight:weight];
}

static void tsn_text_set_kind(NSView *view, TSNTextRuntimeKind kind) {
    objc_setAssociatedObject(view, &kTextRuntimeKindKey, @(kind), OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

static TSNTextRuntimeKind tsn_text_kind(NSView *view) {
    NSNumber *value = objc_getAssociatedObject(view, &kTextRuntimeKindKey);
    return value ? (TSNTextRuntimeKind)value.integerValue : TSNTextRuntimeKindStatic;
}

static void tsn_text_set_wrap_mode(NSView *view, TSNTextRuntimeWrapMode wrapMode, BOOL multiline) {
    objc_setAssociatedObject(view, &kTextRuntimeWrapModeKey, @(wrapMode), OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    objc_setAssociatedObject(view, &kTextRuntimeMultilineKey, @(multiline), OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

static TSNTextRuntimeWrapMode tsn_text_wrap_mode(NSView *view) {
    NSNumber *value = objc_getAssociatedObject(view, &kTextRuntimeWrapModeKey);
    return value ? (TSNTextRuntimeWrapMode)value.integerValue : TSNTextRuntimeWrapModeWrap;
}

static BOOL tsn_text_is_multiline(NSView *view) {
    NSNumber *value = objc_getAssociatedObject(view, &kTextRuntimeMultilineKey);
    return value ? value.boolValue : YES;
}

static void tsn_text_set_line_height_multiplier(NSView *view, CGFloat multiplier) {
    objc_setAssociatedObject(view, &kTextRuntimeLineHeightMultiplierKey, @(multiplier), OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

static void tsn_text_set_monospace(NSView *view, BOOL monospace) {
    objc_setAssociatedObject(view, &kTextRuntimeMonospaceKey, @(monospace), OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

static BOOL tsn_text_is_monospace(NSView *view) {
    NSNumber *value = objc_getAssociatedObject(view, &kTextRuntimeMonospaceKey);
    return value ? value.boolValue : NO;
}

static NSFont *tsn_text_font(NSView *view) {
    if ([view isKindOfClass:[NSTextField class]]) return ((NSTextField *)view).font;
    if ([view isKindOfClass:[TSNTextLabelView class]]) return ((TSNTextLabelView *)view).font;
    return nil;
}

static void tsn_text_set_font(NSView *view, NSFont *font) {
    if ([view isKindOfClass:[NSTextField class]]) ((NSTextField *)view).font = font;
    else if ([view isKindOfClass:[TSNTextLabelView class]]) ((TSNTextLabelView *)view).font = font;
}

static NSColor *tsn_text_color(NSView *view) {
    if ([view isKindOfClass:[NSTextField class]]) return ((NSTextField *)view).textColor;
    if ([view isKindOfClass:[TSNTextLabelView class]]) return ((TSNTextLabelView *)view).textColor;
    return [NSColor colorWithWhite:0.9 alpha:1];
}

static void tsn_text_set_color(NSView *view, NSColor *color) {
    if ([view isKindOfClass:[NSTextField class]]) ((NSTextField *)view).textColor = color;
    else if ([view isKindOfClass:[TSNTextLabelView class]]) ((TSNTextLabelView *)view).textColor = color;
}

static NSString *tsn_text_string(NSView *view) {
    if ([view isKindOfClass:[NSTextField class]]) return ((NSTextField *)view).stringValue ?: @"";
    if ([view isKindOfClass:[TSNTextLabelView class]]) return ((TSNTextLabelView *)view).stringValue ?: @"";
    return @"";
}

static void tsn_text_set_string(NSView *view, NSString *string) {
    if ([view isKindOfClass:[NSTextField class]]) ((NSTextField *)view).stringValue = string ?: @"";
    else if ([view isKindOfClass:[TSNTextLabelView class]]) ((TSNTextLabelView *)view).stringValue = string ?: @"";
}

static NSTextAlignment tsn_text_alignment(NSView *view) {
    if ([view isKindOfClass:[NSTextField class]]) return ((NSTextField *)view).alignment;
    if ([view isKindOfClass:[TSNTextLabelView class]]) return ((TSNTextLabelView *)view).alignment;
    return NSTextAlignmentLeft;
}

static void tsn_text_set_alignment_value(NSView *view, NSTextAlignment alignment) {
    if ([view isKindOfClass:[NSTextField class]]) ((NSTextField *)view).alignment = alignment;
    else if ([view isKindOfClass:[TSNTextLabelView class]]) ((TSNTextLabelView *)view).alignment = alignment;
}

static CGFloat tsn_text_tracking(NSView *view) {
    if ([view isKindOfClass:[TSNTextLabelView class]]) return ((TSNTextLabelView *)view).tracking;
    return 0;
}

static void tsn_text_set_tracking_value(NSView *view, CGFloat tracking) {
    if ([view isKindOfClass:[TSNTextLabelView class]]) ((TSNTextLabelView *)view).tracking = tracking;
}

static CGFloat tsn_text_line_height_multiplier(NSView *view) {
    NSNumber *value = objc_getAssociatedObject(view, &kTextRuntimeLineHeightMultiplierKey);
    if (value) return value.doubleValue;
    NSFont *font = tsn_text_font(view);
    CGFloat fontSize = font ? font.pointSize : 13;
    if (fontSize <= 0) return 1.2;
    return tsn_default_css_line_height_for_size(fontSize) / fontSize;
}

static CGFloat tsn_text_resolved_line_height(NSView *view) {
    NSFont *font = tsn_text_font(view);
    CGFloat fontSize = font ? font.pointSize : 13;
    return fontSize * tsn_text_line_height_multiplier(view);
}

static NSAttributedString *tsn_text_attributed_string(NSView *view) {
    NSString *string = tsn_text_string(view);
    NSMutableParagraphStyle *style = [NSMutableParagraphStyle new];
    TSNTextRuntimeWrapMode wrapMode = tsn_text_wrap_mode(view);
    BOOL multiline = tsn_text_is_multiline(view);
    NSLineBreakMode lineBreakMode = NSLineBreakByWordWrapping;
    if (wrapMode == TSNTextRuntimeWrapModeTruncate) lineBreakMode = NSLineBreakByTruncatingTail;
    else if (wrapMode == TSNTextRuntimeWrapModeClip) lineBreakMode = NSLineBreakByClipping;
    style.lineBreakMode = lineBreakMode;
    style.alignment = tsn_text_alignment(view);
    CGFloat lineHeight = tsn_text_resolved_line_height(view);
    style.minimumLineHeight = lineHeight;
    style.maximumLineHeight = lineHeight;
    NSDictionary *attrs = @{
        NSFontAttributeName: tsn_text_font(view) ?: [NSFont systemFontOfSize:14 weight:NSFontWeightRegular],
        NSForegroundColorAttributeName: tsn_text_color(view) ?: [NSColor colorWithWhite:0.9 alpha:1],
        NSKernAttributeName: @(tsn_text_tracking(view)),
        NSParagraphStyleAttributeName: style,
    };
    NSMutableAttributedString *attr = [[NSMutableAttributedString alloc] initWithString:string attributes:attrs];
    if (!multiline && wrapMode == TSNTextRuntimeWrapModeWrap) {
        [attr addAttribute:NSParagraphStyleAttributeName value:style range:NSMakeRange(0, attr.length)];
    }
    return attr;
}

static NSSize tsn_text_bounding_size(NSView *view, CGFloat maxWidth) {
    NSAttributedString *attr = tsn_text_attributed_string(view);
    if (attr.length == 0) return NSMakeSize(0, tsn_text_resolved_line_height(view));
    CGSize constraint = CGSizeMake(maxWidth > 0 ? maxWidth : CGFLOAT_MAX, CGFLOAT_MAX);
    NSStringDrawingOptions options = NSStringDrawingUsesLineFragmentOrigin | NSStringDrawingUsesFontLeading;
    CGRect bounds = [attr boundingRectWithSize:constraint options:options];
    return NSMakeSize(ceil(bounds.size.width), ceil(MAX(bounds.size.height, tsn_text_resolved_line_height(view))));
}

static void tsn_apply_text_layout_traits(NSTextField *field) {
    TSNTextRuntimeWrapMode wrapMode = tsn_text_wrap_mode(field);
    BOOL multiline = tsn_text_is_multiline(field);

    field.maximumNumberOfLines = multiline ? 0 : 1;
    [field setUsesSingleLineMode:!multiline];

    NSLineBreakMode lineBreakMode = NSLineBreakByWordWrapping;
    BOOL wraps = multiline;
    if (wrapMode == TSNTextRuntimeWrapModeTruncate) {
        lineBreakMode = NSLineBreakByTruncatingTail;
        wraps = NO;
    } else if (wrapMode == TSNTextRuntimeWrapModeClip) {
        lineBreakMode = NSLineBreakByClipping;
        wraps = NO;
    }

    field.lineBreakMode = lineBreakMode;
    [[field cell] setWraps:wraps];

    NSMutableAttributedString *attr = [[NSMutableAttributedString alloc] initWithAttributedString:field.attributedStringValue];
    if (attr.length > 0) {
        NSMutableParagraphStyle *style = [NSMutableParagraphStyle new];
        CGFloat lineHeight = tsn_text_resolved_line_height(field);
        style.minimumLineHeight = lineHeight;
        style.maximumLineHeight = lineHeight;
        style.lineBreakMode = lineBreakMode;
        style.alignment = field.alignment;
        [attr addAttribute:NSParagraphStyleAttributeName value:style range:NSMakeRange(0, attr.length)];
        field.attributedStringValue = attr;
    }
}

typedef CGImageRef (*CGWindowListCreateImageFn)(CGRect, uint32_t, uint32_t, uint32_t);

static CGImageRef capture_window_image(CGWindowID windowID) {
    CGWindowListCreateImageFn fn = (CGWindowListCreateImageFn)dlsym(RTLD_DEFAULT, "CGWindowListCreateImage");
    if (!fn) return NULL;
    return fn(CGRectNull, kCGWindowListOptionIncludingWindow, windowID, kCGWindowImageNominalResolution);
}

#include "runtime/layout_style.inc"
#include "runtime/layout.inc"

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

/* ─── Progress Bar View ──────────────────────────────────────────── */

@interface UIProgressBar : NSView
@property (nonatomic) double progress;
@end

@implementation UIProgressBar {
    CALayer *_fill;
}
- (instancetype)init {
    self = [super init];
    self.wantsLayer = YES;
    self.layer.backgroundColor = [NSColor colorWithWhite:0.24 alpha:1].CGColor;
    self.layer.cornerRadius = 3;
    _fill = [CALayer layer];
    _fill.backgroundColor = NSColor.systemBlueColor.CGColor;
    _fill.cornerRadius = 3;
    [self.layer addSublayer:_fill];
    return self;
}
- (BOOL)isFlipped { return YES; }
- (NSSize)intrinsicContentSize { return NSMakeSize(NSViewNoIntrinsicMetric, 6); }
- (void)layout {
    [super layout];
    CGFloat w = self.bounds.size.width * (_progress >= 0 ? _progress : 0);
    _fill.frame = CGRectMake(0, 0, w, self.bounds.size.height);
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

@interface UISearchDelegate : NSObject <NSControlTextEditingDelegate>
@property (nonatomic) UITextChangedFn callback;
@end

@implementation UISearchDelegate
- (void)controlTextDidChange:(NSNotification *)n {
    NSControl *control = n.object;
    if ([control isKindOfClass:[NSSearchField class]]) {
        if (_callback) _callback(((NSSearchField *)control).stringValue.UTF8String);
        return;
    }
    if ([control isKindOfClass:[NSTextField class]]) {
        if (_callback) _callback(((NSTextField *)control).stringValue.UTF8String);
    }
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
    /* Temporary conservative policy: keep render objects alive.
     * Whole-root rerender works, but eager release here can over-release
     * AppKit-owned views during the current run loop turn.
     */
}
static NSMutableDictionary *g_element_ids;  /* element_id → NSView for inspector lookup */
static NSWindow *g_inspect_window = nil;

void ui_inspector_start(void);

/* ─── API Implementation ─────────────────────────────────────────── */
#include "runtime/windowing.inc"

/* ─── Text ───────────────────────────────────────────────────────── */

UIHandle ui_text(const char *content, int size, bool bold) {
    TSNTextLabelView *t = [[TSNTextLabelView alloc] initWithString:[NSString stringWithUTF8String:content]];
    t.font = tsn_browser_text_font(size, bold ? NSFontWeightBold : NSFontWeightRegular, NO);
    t.textColor = [NSColor colorWithWhite:0.9 alpha:1];
    tsn_text_set_kind(t, TSNTextRuntimeKindStatic);
    tsn_text_set_wrap_mode(t, TSNTextRuntimeWrapModeWrap, YES);
    tsn_text_set_line_height_multiplier(t, tsn_default_css_line_height_for_size(size) / size);
    tsn_text_set_monospace(t, NO);
    tsn_create_view_node(t, TSNNodeKindLeaf, 0, YES);
    retain_render(t);
    return (__bridge UIHandle)t;
}

UIHandle ui_text_mono(const char *content, int size, bool bold) {
    TSNTextLabelView *t = [[TSNTextLabelView alloc] initWithString:[NSString stringWithUTF8String:content]];
    t.font = tsn_browser_text_font(size, bold ? NSFontWeightBold : NSFontWeightRegular, YES);
    t.textColor = [NSColor colorWithWhite:0.9 alpha:1];
    tsn_text_set_kind(t, TSNTextRuntimeKindStatic);
    tsn_text_set_wrap_mode(t, TSNTextRuntimeWrapModeWrap, YES);
    tsn_text_set_line_height_multiplier(t, tsn_default_css_line_height_for_size(size) / size);
    tsn_text_set_monospace(t, YES);
    tsn_create_view_node(t, TSNNodeKindLeaf, 0, YES);
    retain_render(t);
    return (__bridge UIHandle)t;
}

void ui_text_set_color_rgb(UIHandle t, double r, double g, double b, double a) {
    tsn_text_set_color((__bridge NSView *)t, [NSColor colorWithRed:r green:g blue:b alpha:a]);
}

void ui_text_set_color_system(UIHandle t, int c) {
    tsn_text_set_color((__bridge NSView *)t, system_color(c));
}

void ui_text_set_selectable(UIHandle t, bool sel) {
    if ([(__bridge NSView *)t isKindOfClass:[NSTextField class]])
        ((NSTextField *)(__bridge NSView *)t).selectable = sel;
}

static CGFloat font_weight_value(int w) {
    /* Map 0-9 to NSFontWeight constants */
    switch (w) {
        case 0: return NSFontWeightUltraLight;
        case 1: return NSFontWeightThin;
        case 2: return NSFontWeightLight;
        case 3: return NSFontWeightRegular;
        case 4: return NSFontWeightMedium;
        case 5: return NSFontWeightMedium;
        case 6: return NSFontWeightSemibold;
        case 7: return NSFontWeightBold;
        case 8: return NSFontWeightHeavy;
        case 9: return NSFontWeightBlack;
        default: return NSFontWeightRegular;
    }
}

void ui_text_set_weight(UIHandle t, int weight) {
    NSView *view = (__bridge NSView *)t;
    NSFont *font = tsn_text_font(view);
    if (!font) return;
    CGFloat size = font.pointSize;
    NSFont *updated = tsn_browser_text_font(size, font_weight_value(weight), tsn_text_is_monospace(view));
    tsn_text_set_font(view, updated);
    if ([view isKindOfClass:[NSTextField class]]) {
        tsn_apply_text_layout_traits((NSTextField *)view);
        [(NSTextField *)view sizeToFit];
    } else {
        [view invalidateIntrinsicContentSize];
        [view setNeedsDisplay:YES];
    }
}

void ui_text_set_line_height(UIHandle t, double mult) {
    NSView *view = (__bridge NSView *)t;
    tsn_text_set_line_height_multiplier(view, mult);
    if ([view isKindOfClass:[NSTextField class]]) {
        tsn_apply_text_layout_traits((NSTextField *)view);
        [(NSTextField *)view sizeToFit];
    } else {
        [view invalidateIntrinsicContentSize];
        [view setNeedsDisplay:YES];
    }
}

void ui_text_set_tracking(UIHandle t, double kern) {
    NSView *view = (__bridge NSView *)t;
    if ([view isKindOfClass:[NSTextField class]]) {
        NSTextField *field = (NSTextField *)view;
        NSMutableAttributedString *attrStr = [[NSMutableAttributedString alloc] initWithAttributedString:field.attributedStringValue];
        [attrStr addAttribute:NSKernAttributeName value:@(kern) range:NSMakeRange(0, attrStr.length)];
        field.attributedStringValue = attrStr;
        tsn_apply_text_layout_traits(field);
        [field sizeToFit];
        return;
    }
    tsn_text_set_tracking_value(view, kern);
    [view invalidateIntrinsicContentSize];
    [view setNeedsDisplay:YES];
}

void ui_text_set_transform(UIHandle t, int xform) {
    NSView *view = (__bridge NSView *)t;
    NSString *transformed = tsn_text_string(view);
    if (xform == 1) transformed = [transformed uppercaseString];
    else if (xform == 2) transformed = [transformed lowercaseString];
    else return;
    tsn_text_set_string(view, transformed);
    if ([view isKindOfClass:[NSTextField class]]) {
        tsn_apply_text_layout_traits((NSTextField *)view);
        [(NSTextField *)view sizeToFit];
    } else {
        [view invalidateIntrinsicContentSize];
        [view setNeedsDisplay:YES];
    }
}

void ui_text_set_align(UIHandle t, int align) {
    NSView *view = (__bridge NSView *)t;
    if (align == 0) tsn_text_set_alignment_value(view, NSTextAlignmentLeft);
    else if (align == 1) tsn_text_set_alignment_value(view, NSTextAlignmentCenter);
    else if (align == 2) tsn_text_set_alignment_value(view, NSTextAlignmentRight);
    if ([view isKindOfClass:[NSTextField class]]) {
        tsn_apply_text_layout_traits((NSTextField *)view);
    } else {
        [view setNeedsDisplay:YES];
    }
}

void ui_text_set_truncate(UIHandle t) {
    NSView *view = (__bridge NSView *)t;
    tsn_text_set_wrap_mode(view, TSNTextRuntimeWrapModeTruncate, NO);
    if ([view isKindOfClass:[NSTextField class]]) {
        tsn_apply_text_layout_traits((NSTextField *)view);
        [(NSTextField *)view sizeToFit];
    } else {
        [view invalidateIntrinsicContentSize];
        [view setNeedsDisplay:YES];
    }
}

UIHandle ui_label(const char *content) {
    UIHandle h = ui_text(content, 11, false);
    ui_text_set_color_system(h, 2);
    return h;
}

#include "runtime/controls.inc"

/* ─── Segmented Control ──────────────────────────────────────────── */
UIHandle ui_segmented(int count, const char **labels) {
    NSMutableArray *arr = [NSMutableArray new];
    for (int i = 0; i < count; i++) [arr addObject:[NSString stringWithUTF8String:labels[i]]];
    NSSegmentedControl *sc = [NSSegmentedControl segmentedControlWithLabels:arr
        trackingMode:NSSegmentSwitchTrackingSelectOne target:nil action:nil];
    sc.selectedSegment = 0;
    tsn_create_view_node(sc, TSNNodeKindLeaf, 0, YES);
    retain_render(sc);
    return (__bridge UIHandle)sc;
}

void ui_segmented_on_change(UIHandle seg, UISegmentFn fn) { /* TODO */ }

/* ─── Toggle ─────────────────────────────────────────────────────── */
UIHandle ui_toggle(const char *label, bool initial) {
    NSSwitch *sw = [NSSwitch new];
    sw.state = initial ? NSControlStateValueOn : NSControlStateValueOff;
    tsn_create_view_node(sw, TSNNodeKindLeaf, 0, YES);
    retain_render(sw);
    return (__bridge UIHandle)sw;
}
void ui_toggle_on_change(UIHandle tog, UIToggleFn fn) { /* TODO */ }

/* ─── Progress ───────────────────────────────────────────────────── */
UIHandle ui_progress(double value) {
    UIProgressBar *bar = [UIProgressBar new];
    bar.progress = value;
    tsn_create_view_node(bar, TSNNodeKindLeaf, 0, YES);
    retain_render(bar);
    return (__bridge UIHandle)bar;
}

void ui_progress_set(UIHandle p, double value) {
    UIProgressBar *bar = (__bridge UIProgressBar *)p;
    if ([bar isKindOfClass:[UIProgressBar class]]) {
        bar.progress = value;
        [bar setNeedsLayout:YES];
    }
}

/* ─── Badge ──────────────────────────────────────────────────────── */
UIHandle ui_badge(const char *text, int sc) {
    /* Wrap text in a padded stack to match CSS padding: 2px 8px */
    UIStackContainer *wrap = [UIStackContainer new];
    TSNShadowNode *wrapNode = tsn_create_container_node(wrap, TSNNodeKindHStack, 1);
    YGNodeStyleSetPadding(wrapNode.yogaNode, YGEdgeTop, 2);
    YGNodeStyleSetPadding(wrapNode.yogaNode, YGEdgeBottom, 2);
    YGNodeStyleSetPadding(wrapNode.yogaNode, YGEdgeLeft, 8);
    YGNodeStyleSetPadding(wrapNode.yogaNode, YGEdgeRight, 8);
    YGNodeStyleSetAlignSelf(wrapNode.yogaNode, YGAlignFlexStart);
    wrap.wantsLayer = YES;
    wrap.layer.backgroundColor = system_color(sc).CGColor;
    wrap.layer.cornerRadius = 8;
    wrap.layer.masksToBounds = YES;

    NSTextField *t = [NSTextField labelWithString:[NSString stringWithUTF8String:text]];
    t.font = [NSFont systemFontOfSize:10 weight:NSFontWeightBold];
    t.textColor = [NSColor whiteColor];
    t.drawsBackground = NO;
    t.alignment = NSTextAlignmentCenter;
    TSNShadowNode *textNode = tsn_create_view_node(t, TSNNodeKindLeaf, 0, YES);
    tsn_attach_child_nodes(wrapNode, textNode);

    retain_render(wrap);
    retain_render(t);
    return (__bridge UIHandle)wrap;
}

/* ─── Card ───────────────────────────────────────────────────────── */
UIHandle ui_card(void) {
    UIStackContainer *c = [UIStackContainer new];
    c.direction = 0;
    c.wantsLayer = YES;
    c.layer.backgroundColor = [NSColor colorWithWhite:0.12 alpha:1].CGColor;
    c.layer.cornerRadius = 12;
    c.layer.masksToBounds = YES;
    objc_setAssociatedObject(c, &kCardContainerKey, @YES, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    /* No default padding — let Tailwind classes set it via ui_set_padding */
    tsn_create_container_node(c, TSNNodeKindVStack, 0);
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
    tsn_create_view_node(sv, TSNNodeKindLeaf, 0, YES);
    retain_render(sv);
    return (__bridge UIHandle)sv;
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

    tsn_create_view_node(sv, TSNNodeKindLeaf, 0, YES);
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
    tsn_create_view_node(c, TSNNodeKindLeaf, 0, YES);
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

#include "runtime/shell.inc"

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

void ui_set_shadow(UIHandle v, double ox, double oy, double radius, double opacity) {
    NSView *view = (__bridge NSView *)v;
    view.wantsLayer = YES;
    view.layer.shadowColor = NSColor.blackColor.CGColor;
    view.layer.shadowOffset = CGSizeMake(ox, oy);
    view.layer.shadowRadius = radius;
    view.layer.shadowOpacity = opacity;
    /* Use shadowPath to allow shadows even with masksToBounds on corner-radiused views */
    if (view.layer.cornerRadius > 0) {
        CGRect bounds = view.bounds.size.width > 0 ? view.bounds : NSMakeRect(0, 0, 100, 100);
        view.layer.shadowPath = CGPathCreateWithRoundedRect(bounds, view.layer.cornerRadius, view.layer.cornerRadius, NULL);
        view.layer.masksToBounds = NO;
    }
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
#include "runtime/inspector.inc"
