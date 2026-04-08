/* ─── Deferred Layout Style ─────────────────────────────────────── */

typedef NS_ENUM(int, TSNLayoutUnit) {
    TSNLayoutUnitUnset = 0,
    TSNLayoutUnitPoint = 1,
    TSNLayoutUnitPercent = 2,
};

typedef struct {
    TSNLayoutUnit unit;
    CGFloat value;
} TSNLayoutLength;

static inline TSNLayoutLength tsn_layout_length_point(CGFloat value) {
    TSNLayoutLength length = { TSNLayoutUnitPoint, value };
    return length;
}

static inline TSNLayoutLength tsn_layout_length_percent(CGFloat value) {
    TSNLayoutLength length = { TSNLayoutUnitPercent, value };
    return length;
}

static inline BOOL tsn_layout_length_is_set(TSNLayoutLength length) {
    return length.unit != TSNLayoutUnitUnset;
}

@interface TSNPendingLayoutStyle : NSObject {
@public
    BOOL hasPadding;
    int paddingTop;
    int paddingRight;
    int paddingBottom;
    int paddingLeft;

    BOOL hasSpacing;
    int spacing;

    BOOL hasFlex;
    CGFloat flex;

    TSNLayoutLength width;
    TSNLayoutLength height;
    TSNLayoutLength minWidth;
    TSNLayoutLength minHeight;
    TSNLayoutLength maxWidth;
    TSNLayoutLength maxHeight;

    BOOL hasAlignSelf;
    int alignSelf;

    BOOL hasMarginAuto;

    BOOL hasAlignItems;
    int alignItems;

    BOOL hasJustifyContent;
    int justifyContent;
}
@end

@implementation TSNPendingLayoutStyle
@end

static char kPendingLayoutStyleKey;

static TSNPendingLayoutStyle *tsn_pending_layout_style(NSView *view, BOOL create) {
    TSNPendingLayoutStyle *style = objc_getAssociatedObject(view, &kPendingLayoutStyleKey);
    if (!style && create) {
        style = [TSNPendingLayoutStyle new];
        objc_setAssociatedObject(view, &kPendingLayoutStyleKey, style, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    }
    return style;
}

static YGAlign tsn_yoga_align_self(int align) {
    if (align == 1) return YGAlignCenter;
    if (align == 2) return YGAlignFlexEnd;
    return YGAlignAuto;
}

static YGAlign tsn_yoga_align_items(int align) {
    if (align == 0) return YGAlignFlexStart;
    if (align == 1) return YGAlignCenter;
    if (align == 2) return YGAlignFlexEnd;
    return YGAlignStretch;
}

static YGJustify tsn_yoga_justify(int justify) {
    if (justify == 1) return YGJustifyCenter;
    if (justify == 2) return YGJustifyFlexEnd;
    if (justify == 3) return YGJustifySpaceBetween;
    return YGJustifyFlexStart;
}

static void tsn_apply_width_length(YGNodeRef node, TSNLayoutLength length) {
    if (!tsn_layout_length_is_set(length)) return;
    if (length.unit == TSNLayoutUnitPercent) YGNodeStyleSetWidthPercent(node, length.value);
    else YGNodeStyleSetWidth(node, length.value);
}

static void tsn_apply_height_length(YGNodeRef node, TSNLayoutLength length) {
    if (!tsn_layout_length_is_set(length)) return;
    if (length.unit == TSNLayoutUnitPercent) YGNodeStyleSetHeightPercent(node, length.value);
    else YGNodeStyleSetHeight(node, length.value);
}

static void tsn_apply_min_width_length(YGNodeRef node, TSNLayoutLength length) {
    if (!tsn_layout_length_is_set(length)) return;
    if (length.unit == TSNLayoutUnitPercent) YGNodeStyleSetMinWidthPercent(node, length.value);
    else YGNodeStyleSetMinWidth(node, length.value);
}

static void tsn_apply_min_height_length(YGNodeRef node, TSNLayoutLength length) {
    if (!tsn_layout_length_is_set(length)) return;
    if (length.unit == TSNLayoutUnitPercent) YGNodeStyleSetMinHeightPercent(node, length.value);
    else YGNodeStyleSetMinHeight(node, length.value);
}

static void tsn_apply_max_width_length(YGNodeRef node, TSNLayoutLength length) {
    if (!tsn_layout_length_is_set(length)) return;
    if (length.unit == TSNLayoutUnitPercent) YGNodeStyleSetMaxWidthPercent(node, length.value);
    else YGNodeStyleSetMaxWidth(node, length.value);
}

static void tsn_apply_max_height_length(YGNodeRef node, TSNLayoutLength length) {
    if (!tsn_layout_length_is_set(length)) return;
    if (length.unit == TSNLayoutUnitPercent) YGNodeStyleSetMaxHeightPercent(node, length.value);
    else YGNodeStyleSetMaxHeight(node, length.value);
}

static void tsn_apply_pending_layout_style(NSView *view, YGNodeRef node) {
    if (!node) return;

    TSNPendingLayoutStyle *style = tsn_pending_layout_style(view, NO);
    if (!style) return;

    if (style->hasPadding) {
        YGNodeStyleSetPadding(node, YGEdgeTop, style->paddingTop);
        YGNodeStyleSetPadding(node, YGEdgeRight, style->paddingRight);
        YGNodeStyleSetPadding(node, YGEdgeBottom, style->paddingBottom);
        YGNodeStyleSetPadding(node, YGEdgeLeft, style->paddingLeft);
    }
    if (style->hasSpacing) YGNodeStyleSetGap(node, YGGutterAll, style->spacing);
    if (style->hasFlex) YGNodeStyleSetFlex(node, style->flex);

    tsn_apply_width_length(node, style->width);
    tsn_apply_height_length(node, style->height);
    tsn_apply_min_width_length(node, style->minWidth);
    tsn_apply_min_height_length(node, style->minHeight);
    tsn_apply_max_width_length(node, style->maxWidth);
    tsn_apply_max_height_length(node, style->maxHeight);

    if (style->hasAlignSelf) YGNodeStyleSetAlignSelf(node, tsn_yoga_align_self(style->alignSelf));
    if (style->hasMarginAuto) {
        YGNodeStyleSetWidthPercent(node, 100);
        YGNodeStyleSetMarginAuto(node, YGEdgeLeft);
        YGNodeStyleSetMarginAuto(node, YGEdgeRight);
    }
    if (style->hasAlignItems) YGNodeStyleSetAlignItems(node, tsn_yoga_align_items(style->alignItems));
    if (style->hasJustifyContent) YGNodeStyleSetJustifyContent(node, tsn_yoga_justify(style->justifyContent));
}
