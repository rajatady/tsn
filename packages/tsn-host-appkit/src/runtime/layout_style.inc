/* ─── Responsive Layout Style ───────────────────────────────────── */

typedef NS_ENUM(int, TSNLayoutUnit) {
    TSNLayoutUnitUnset = 0,
    TSNLayoutUnitPoint = 1,
    TSNLayoutUnitPercent = 2,
};

typedef struct {
    TSNLayoutUnit unit;
    CGFloat value;
} TSNLayoutLength;

static inline TSNLayoutLength tsn_layout_length_unset(void) {
    TSNLayoutLength length = { TSNLayoutUnitUnset, 0 };
    return length;
}

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

    BOOL hasMargin;
    int marginTop;
    int marginRight;
    int marginBottom;
    int marginLeft;

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

    BOOL hasPositionType;
    int positionType;

    TSNLayoutLength insetTop;
    TSNLayoutLength insetRight;
    TSNLayoutLength insetBottom;
    TSNLayoutLength insetLeft;

    BOOL hasAspectRatio;
    CGFloat aspectRatio;

    BOOL hasAlignSelf;
    int alignSelf;

    BOOL hasMarginAuto;

    BOOL hasAlignItems;
    int alignItems;

    BOOL hasJustifyContent;
    int justifyContent;

    BOOL hasScrollAxis;
    int scrollAxis;
}
@end

@implementation TSNPendingLayoutStyle
- (instancetype)init {
    self = [super init];
    if (!self) return nil;
    width = tsn_layout_length_unset();
    height = tsn_layout_length_unset();
    minWidth = tsn_layout_length_unset();
    minHeight = tsn_layout_length_unset();
    maxWidth = tsn_layout_length_unset();
    maxHeight = tsn_layout_length_unset();
    insetTop = tsn_layout_length_unset();
    insetRight = tsn_layout_length_unset();
    insetBottom = tsn_layout_length_unset();
    insetLeft = tsn_layout_length_unset();
    return self;
}
@end

@interface TSNResponsiveLayoutVariant : NSObject
@property (nonatomic) CGFloat minWidth;
@property (nonatomic, strong) TSNPendingLayoutStyle *style;
@end

@implementation TSNResponsiveLayoutVariant
@end

@interface TSNResponsiveLayoutState : NSObject
@property (nonatomic, strong) TSNPendingLayoutStyle *baseStyle;
@property (nonatomic, strong) NSMutableArray<TSNResponsiveLayoutVariant *> *variants;
@end

@implementation TSNResponsiveLayoutState
- (instancetype)init {
    self = [super init];
    if (!self) return nil;
    _baseStyle = [TSNPendingLayoutStyle new];
    _variants = [NSMutableArray new];
    return self;
}
@end

static char kResponsiveLayoutStateKey;
static __weak NSView *gResponsiveVariantView = nil;
static TSNResponsiveLayoutVariant *gResponsiveVariant = nil;

static TSNResponsiveLayoutState *tsn_responsive_layout_state(NSView *view, BOOL create) {
    TSNResponsiveLayoutState *state = objc_getAssociatedObject(view, &kResponsiveLayoutStateKey);
    if (!state && create) {
        state = [TSNResponsiveLayoutState new];
        objc_setAssociatedObject(view, &kResponsiveLayoutStateKey, state, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    }
    return state;
}

static BOOL tsn_is_recording_responsive_variant(NSView *view) {
    return gResponsiveVariantView != nil && gResponsiveVariantView == view && gResponsiveVariant != nil;
}

static TSNPendingLayoutStyle *tsn_current_layout_style(NSView *view, BOOL create) {
    TSNResponsiveLayoutState *state = tsn_responsive_layout_state(view, create);
    if (!state) return nil;
    if (tsn_is_recording_responsive_variant(view)) {
      if (!gResponsiveVariant.style && create) gResponsiveVariant.style = [TSNPendingLayoutStyle new];
      return gResponsiveVariant.style;
    }
    if (!state.baseStyle && create) state.baseStyle = [TSNPendingLayoutStyle new];
    return state.baseStyle;
}

static TSNResponsiveLayoutVariant *tsn_responsive_variant_for_min_width(NSView *view, CGFloat minWidth, BOOL create) {
    TSNResponsiveLayoutState *state = tsn_responsive_layout_state(view, create);
    if (!state) return nil;
    for (TSNResponsiveLayoutVariant *variant in state.variants) {
        if (fabs(variant.minWidth - minWidth) < 0.5) return variant;
    }
    if (!create) return nil;
    TSNResponsiveLayoutVariant *variant = [TSNResponsiveLayoutVariant new];
    variant.minWidth = minWidth;
    variant.style = [TSNPendingLayoutStyle new];
    [state.variants addObject:variant];
    return variant;
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

static void tsn_reset_width_length(YGNodeRef node) {
    YGNodeStyleSetWidth(node, YGUndefined);
}

static void tsn_reset_height_length(YGNodeRef node) {
    YGNodeStyleSetHeight(node, YGUndefined);
}

static void tsn_reset_min_width_length(YGNodeRef node) {
    YGNodeStyleSetMinWidth(node, YGUndefined);
}

static void tsn_reset_min_height_length(YGNodeRef node) {
    YGNodeStyleSetMinHeight(node, YGUndefined);
}

static void tsn_reset_max_width_length(YGNodeRef node) {
    YGNodeStyleSetMaxWidth(node, YGUndefined);
}

static void tsn_reset_max_height_length(YGNodeRef node) {
    YGNodeStyleSetMaxHeight(node, YGUndefined);
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

static void tsn_apply_position_length(YGNodeRef node, YGEdge edge, TSNLayoutLength length) {
    if (!tsn_layout_length_is_set(length)) return;
    if (length.unit == TSNLayoutUnitPercent) YGNodeStyleSetPositionPercent(node, edge, length.value);
    else YGNodeStyleSetPosition(node, edge, length.value);
}

static void tsn_apply_scroll_axis(TSNShadowNode *node, int axis) {
    if (!node) return;
    node.scrollAxis = axis;
    if (node.kind == TSNNodeKindScroll && [node.view isKindOfClass:[NSScrollView class]]) {
        NSScrollView *scroll = (NSScrollView *)node.view;
        if (axis == 1) {
            scroll.hasHorizontalScroller = YES;
            scroll.hasVerticalScroller = NO;
        } else {
            scroll.hasHorizontalScroller = NO;
            scroll.hasVerticalScroller = YES;
        }
    }
}

static void tsn_reset_layout_style(TSNShadowNode *node) {
    if (!node || !node.yogaNode) return;
    YGNodeRef yogaNode = node.yogaNode;
    YGNodeStyleSetPadding(yogaNode, YGEdgeTop, 0);
    YGNodeStyleSetPadding(yogaNode, YGEdgeRight, 0);
    YGNodeStyleSetPadding(yogaNode, YGEdgeBottom, 0);
    YGNodeStyleSetPadding(yogaNode, YGEdgeLeft, 0);
    YGNodeStyleSetMargin(yogaNode, YGEdgeTop, 0);
    YGNodeStyleSetMargin(yogaNode, YGEdgeRight, 0);
    YGNodeStyleSetMargin(yogaNode, YGEdgeBottom, 0);
    YGNodeStyleSetMargin(yogaNode, YGEdgeLeft, 0);
    YGNodeStyleSetGap(yogaNode, YGGutterAll, 0);
    YGNodeStyleSetFlexGrow(yogaNode, 0);
    YGNodeStyleSetFlexShrink(yogaNode, 0);
    YGNodeStyleSetFlexBasisAuto(yogaNode);
    tsn_reset_width_length(yogaNode);
    tsn_reset_height_length(yogaNode);
    tsn_reset_min_width_length(yogaNode);
    tsn_reset_min_height_length(yogaNode);
    tsn_reset_max_width_length(yogaNode);
    tsn_reset_max_height_length(yogaNode);
    YGNodeStyleSetPositionType(yogaNode, YGPositionTypeRelative);
    YGNodeStyleSetPosition(yogaNode, YGEdgeTop, YGUndefined);
    YGNodeStyleSetPosition(yogaNode, YGEdgeRight, YGUndefined);
    YGNodeStyleSetPosition(yogaNode, YGEdgeBottom, YGUndefined);
    YGNodeStyleSetPosition(yogaNode, YGEdgeLeft, YGUndefined);
    YGNodeStyleSetAlignSelf(yogaNode, YGAlignAuto);
    YGNodeStyleSetAlignItems(yogaNode, YGAlignStretch);
    YGNodeStyleSetJustifyContent(yogaNode, YGJustifyFlexStart);
    YGNodeStyleSetAspectRatio(yogaNode, YGUndefined);
    tsn_apply_scroll_axis(node, 0);
}

static void tsn_apply_layout_style(TSNShadowNode *node, TSNPendingLayoutStyle *style) {
    if (!node || !node.yogaNode || !style) return;
    YGNodeRef yogaNode = node.yogaNode;

    if (style->hasPadding) {
        YGNodeStyleSetPadding(yogaNode, YGEdgeTop, style->paddingTop);
        YGNodeStyleSetPadding(yogaNode, YGEdgeRight, style->paddingRight);
        YGNodeStyleSetPadding(yogaNode, YGEdgeBottom, style->paddingBottom);
        YGNodeStyleSetPadding(yogaNode, YGEdgeLeft, style->paddingLeft);
    }
    if (style->hasMargin) {
        YGNodeStyleSetMargin(yogaNode, YGEdgeTop, style->marginTop);
        YGNodeStyleSetMargin(yogaNode, YGEdgeRight, style->marginRight);
        YGNodeStyleSetMargin(yogaNode, YGEdgeBottom, style->marginBottom);
        YGNodeStyleSetMargin(yogaNode, YGEdgeLeft, style->marginLeft);
    }
    if (style->hasSpacing) YGNodeStyleSetGap(yogaNode, YGGutterAll, style->spacing);
    if (style->hasFlex) {
        if (style->flex > 0) {
            YGNodeStyleSetFlexGrow(yogaNode, style->flex);
            YGNodeStyleSetFlexShrink(yogaNode, 1);
            YGNodeStyleSetFlexBasis(yogaNode, 0);
        } else {
            YGNodeStyleSetFlexGrow(yogaNode, 0);
            YGNodeStyleSetFlexShrink(yogaNode, 0);
            YGNodeStyleSetFlexBasisAuto(yogaNode);
        }
    }

    tsn_apply_width_length(yogaNode, style->width);
    tsn_apply_height_length(yogaNode, style->height);
    tsn_apply_min_width_length(yogaNode, style->minWidth);
    tsn_apply_min_height_length(yogaNode, style->minHeight);
    tsn_apply_max_width_length(yogaNode, style->maxWidth);
    tsn_apply_max_height_length(yogaNode, style->maxHeight);

    if (style->hasPositionType) {
        YGNodeStyleSetPositionType(yogaNode, style->positionType == 1 ? YGPositionTypeAbsolute : YGPositionTypeRelative);
    }
    tsn_apply_position_length(yogaNode, YGEdgeTop, style->insetTop);
    tsn_apply_position_length(yogaNode, YGEdgeRight, style->insetRight);
    tsn_apply_position_length(yogaNode, YGEdgeBottom, style->insetBottom);
    tsn_apply_position_length(yogaNode, YGEdgeLeft, style->insetLeft);

    if (style->hasAspectRatio && style->aspectRatio > 0) {
        YGNodeStyleSetAspectRatio(yogaNode, style->aspectRatio);
    }
    if (style->hasAlignSelf) YGNodeStyleSetAlignSelf(yogaNode, tsn_yoga_align_self(style->alignSelf));
    if (style->hasMarginAuto) {
        YGNodeStyleSetWidthPercent(yogaNode, 100);
        YGNodeStyleSetMarginAuto(yogaNode, YGEdgeLeft);
        YGNodeStyleSetMarginAuto(yogaNode, YGEdgeRight);
    }
    if (style->hasAlignItems) YGNodeStyleSetAlignItems(yogaNode, tsn_yoga_align_items(style->alignItems));
    if (style->hasJustifyContent) YGNodeStyleSetJustifyContent(yogaNode, tsn_yoga_justify(style->justifyContent));
    if (style->hasScrollAxis) tsn_apply_scroll_axis(node, style->scrollAxis);
}

static void tsn_apply_responsive_layout_tree(TSNShadowNode *node, CGFloat viewportWidth) {
    if (!node || !node.view) return;
    tsn_reset_layout_style(node);

    TSNResponsiveLayoutState *state = tsn_responsive_layout_state(node.view, NO);
    if (state.baseStyle) tsn_apply_layout_style(node, state.baseStyle);
    for (TSNResponsiveLayoutVariant *variant in state.variants) {
        if (viewportWidth >= variant.minWidth) {
            tsn_apply_layout_style(node, variant.style);
        }
    }

    for (TSNShadowNode *child in node.children) {
        tsn_apply_responsive_layout_tree(child, viewportWidth);
    }
}
