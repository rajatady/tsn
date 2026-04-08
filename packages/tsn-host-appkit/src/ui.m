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
    NSTextField *t = [NSTextField labelWithString:[NSString stringWithUTF8String:content]];
    t.font = [NSFont systemFontOfSize:size weight:bold ? NSFontWeightBold : NSFontWeightRegular];
    t.textColor = [NSColor colorWithWhite:0.9 alpha:1];
    t.drawsBackground = NO;
    t.lineBreakMode = NSLineBreakByWordWrapping;
    t.maximumNumberOfLines = 0;
    [t setUsesSingleLineMode:NO];
    [[t cell] setWraps:YES];
    CGFloat lh = default_css_line_height_for_size(size);
    NSMutableAttributedString *attrStr = [[NSMutableAttributedString alloc] initWithAttributedString:t.attributedStringValue];
    NSMutableParagraphStyle *pstyle = [NSMutableParagraphStyle new];
    pstyle.minimumLineHeight = lh;
    pstyle.maximumLineHeight = lh;
    [attrStr addAttribute:NSParagraphStyleAttributeName value:pstyle range:NSMakeRange(0, attrStr.length)];
    t.attributedStringValue = attrStr;
    [t sizeToFit];
    tsn_create_view_node(t, TSNNodeKindLeaf, 0, YES);
    retain_render(t);
    return (__bridge UIHandle)t;
}

UIHandle ui_text_mono(const char *content, int size, bool bold) {
    NSTextField *t = [NSTextField labelWithString:[NSString stringWithUTF8String:content]];
    t.font = [NSFont monospacedDigitSystemFontOfSize:size weight:bold ? NSFontWeightBold : NSFontWeightRegular];
    t.textColor = [NSColor colorWithWhite:0.9 alpha:1];
    t.drawsBackground = NO;
    t.lineBreakMode = NSLineBreakByWordWrapping;
    t.maximumNumberOfLines = 0;
    [t setUsesSingleLineMode:NO];
    [[t cell] setWraps:YES];
    CGFloat lh = default_css_line_height_for_size(size);
    NSMutableAttributedString *attrStr = [[NSMutableAttributedString alloc] initWithAttributedString:t.attributedStringValue];
    NSMutableParagraphStyle *pstyle = [NSMutableParagraphStyle new];
    pstyle.minimumLineHeight = lh;
    pstyle.maximumLineHeight = lh;
    [attrStr addAttribute:NSParagraphStyleAttributeName value:pstyle range:NSMakeRange(0, attrStr.length)];
    t.attributedStringValue = attrStr;
    [t sizeToFit];
    tsn_create_view_node(t, TSNNodeKindLeaf, 0, YES);
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
    if (![view isKindOfClass:[NSTextField class]]) return;
    NSTextField *field = (NSTextField *)view;
    CGFloat size = field.font.pointSize;
    field.font = [NSFont systemFontOfSize:size weight:font_weight_value(weight)];
    [field sizeToFit];
}

void ui_text_set_line_height(UIHandle t, double mult) {
    NSView *view = (__bridge NSView *)t;
    if (![view isKindOfClass:[NSTextField class]]) return;
    NSTextField *field = (NSTextField *)view;
    /* CSS line-height is font-size * multiplier. NSParagraphStyle lineHeightMultiple
       multiplies the natural line height (ascender+descender), which is already ~1.2x
       the font size. To match CSS, use explicit min/max line height = font-size * mult. */
    CGFloat fontSize = field.font.pointSize;
    CGFloat targetLineHeight = fontSize * mult;
    NSMutableAttributedString *attrStr = [[NSMutableAttributedString alloc] initWithAttributedString:field.attributedStringValue];
    NSMutableParagraphStyle *style = [NSMutableParagraphStyle new];
    style.minimumLineHeight = targetLineHeight;
    style.maximumLineHeight = targetLineHeight;
    [attrStr addAttribute:NSParagraphStyleAttributeName value:style range:NSMakeRange(0, attrStr.length)];
    field.attributedStringValue = attrStr;
    [field sizeToFit];
}

void ui_text_set_tracking(UIHandle t, double kern) {
    NSView *view = (__bridge NSView *)t;
    if (![view isKindOfClass:[NSTextField class]]) return;
    NSTextField *field = (NSTextField *)view;
    NSMutableAttributedString *attrStr = [[NSMutableAttributedString alloc] initWithAttributedString:field.attributedStringValue];
    [attrStr addAttribute:NSKernAttributeName value:@(kern) range:NSMakeRange(0, attrStr.length)];
    field.attributedStringValue = attrStr;
    [field sizeToFit];
}

void ui_text_set_transform(UIHandle t, int xform) {
    NSView *view = (__bridge NSView *)t;
    if (![view isKindOfClass:[NSTextField class]]) return;
    NSTextField *field = (NSTextField *)view;
    /* Preserve paragraph style (line-height) when transforming text */
    NSMutableAttributedString *attrStr = [[NSMutableAttributedString alloc] initWithAttributedString:field.attributedStringValue];
    NSString *transformed = [attrStr string];
    if (xform == 1) transformed = [transformed uppercaseString];
    else if (xform == 2) transformed = [transformed lowercaseString];
    else return;
    NSDictionary *attrs = attrStr.length > 0 ? [attrStr attributesAtIndex:0 effectiveRange:NULL] : @{};
    field.attributedStringValue = [[NSAttributedString alloc] initWithString:transformed attributes:attrs];
    [field sizeToFit];
}

void ui_text_set_align(UIHandle t, int align) {
    NSView *view = (__bridge NSView *)t;
    if (![view isKindOfClass:[NSTextField class]]) return;
    NSTextField *field = (NSTextField *)view;
    if (align == 0) field.alignment = NSTextAlignmentLeft;
    else if (align == 1) field.alignment = NSTextAlignmentCenter;
    else if (align == 2) field.alignment = NSTextAlignmentRight;
}

void ui_text_set_truncate(UIHandle t) {
    NSView *view = (__bridge NSView *)t;
    if (![view isKindOfClass:[NSTextField class]]) return;
    NSTextField *field = (NSTextField *)view;
    field.maximumNumberOfLines = 1;
    field.lineBreakMode = NSLineBreakByTruncatingTail;
    [field setUsesSingleLineMode:YES];
    [[field cell] setWraps:NO];
    [field sizeToFit];
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
