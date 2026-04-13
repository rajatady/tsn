/*
 * TSN Native UI Runtime — UIKit implementation
 *
 * This is the first real iOS host path. It intentionally implements the
 * subset needed by the App Store demo end to end while keeping the same ui_*
 * ABI as the AppKit host.
 */

#import <UIKit/UIKit.h>
#import <QuartzCore/QuartzCore.h>
#import <objc/runtime.h>
#include "ui.h"
#include "runtime.h"
#include <yoga/Yoga.h>
#include <arpa/inet.h>
#include <math.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

static inline void retain_render(id obj);
static inline void retain_persistent(id obj);
static void finish_render_cycle(void);

static NSMutableArray *g_render_retained;
static NSMutableArray *g_persistent_retained;
static NSMutableDictionary<NSString *, id> *g_element_ids;

static char kTSNShadowNodeKey;
static char kGradientLayerKey;
static char kAspectRatioKey;
static char kCardContainerKey;
static char kButtonClickTargetKey;
static char kGestureClickTargetKey;

typedef NS_ENUM(NSInteger, TSNTextTransformKind) {
    TSNTextTransformKindNone = 0,
    TSNTextTransformKindUppercase = 1,
    TSNTextTransformKindLowercase = 2,
};

typedef NS_ENUM(int, TSNNodeKind) {
    TSNNodeKindView = 1,
    TSNNodeKindVStack = 2,
    TSNNodeKindHStack = 3,
    TSNNodeKindZStack = 4,
    TSNNodeKindScroll = 5,
    TSNNodeKindLeaf = 6,
};

@class TSNShadowNode;
@class TSNClickTarget;

@interface TSNAppWindow : NSObject
@property (nonatomic, copy) NSString *title;
@property (nonatomic, copy) NSString *subtitle;
@property (nonatomic) BOOL dark;
@property (nonatomic, strong) UIView *rootView;
@property (nonatomic, strong) TSNShadowNode *rootNode;
@end

@implementation TSNAppWindow
@end

@interface TSNContainerView : UIView
@property (nonatomic, strong) id tsnClickTarget;
@end

@implementation TSNContainerView
- (instancetype)init {
    self = [super initWithFrame:CGRectZero];
    if (!self) return nil;
    self.userInteractionEnabled = YES;
    return self;
}

- (void)touchesEnded:(NSSet<UITouch *> *)touches withEvent:(UIEvent *)event {
    [super touchesEnded:touches withEvent:event];
    if (self.tsnClickTarget != nil) {
        [(NSObject *)self.tsnClickTarget performSelector:@selector(invokeControl:) withObject:self];
    }
}
@end

@interface TSNSpacerView : UIView
@end

@implementation TSNSpacerView
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

static UIFontWeight tsn_font_weight_from_index(int weight) {
    switch (weight) {
        case 0: return UIFontWeightThin;
        case 1: return UIFontWeightUltraLight;
        case 2: return UIFontWeightLight;
        case 3: return UIFontWeightRegular;
        case 4: return UIFontWeightRegular;
        case 5: return UIFontWeightMedium;
        case 6: return UIFontWeightSemibold;
        case 7: return UIFontWeightBold;
        case 8: return UIFontWeightHeavy;
        case 9: return UIFontWeightBlack;
        default: return UIFontWeightRegular;
    }
}

static UIColor *system_color(int idx) {
    switch (idx) {
        case 0: return [UIColor labelColor];
        case 1: return [UIColor secondaryLabelColor];
        case 2: return [UIColor tertiaryLabelColor];
        case 3: return [UIColor systemBlueColor];
        case 4: return [UIColor systemGreenColor];
        case 5: return [UIColor systemRedColor];
        case 6: return [UIColor systemOrangeColor];
        case 7: return [UIColor systemYellowColor];
        case 8: return [UIColor systemPurpleColor];
        case 9: return [UIColor systemPinkColor];
        case 10: return [UIColor systemTealColor];
        case 11: return [UIColor systemIndigoColor];
        case 12: return [UIColor systemCyanColor];
        default: return [UIColor labelColor];
    }
}

static UIFont *tsn_text_font(CGFloat size, UIFontWeight weight, BOOL monospace) {
    if (monospace) return [UIFont monospacedSystemFontOfSize:size weight:weight];
    return [UIFont systemFontOfSize:size weight:weight];
}

@interface TSNTextLabel : UILabel
@property (nonatomic, copy) NSString *tsnRawText;
@property (nonatomic) CGFloat tsnPointSize;
@property (nonatomic) UIFontWeight tsnWeight;
@property (nonatomic) CGFloat tsnTracking;
@property (nonatomic) CGFloat tsnLineHeightMultiplier;
@property (nonatomic) TSNTextTransformKind tsnTransform;
@property (nonatomic) BOOL tsnMonospace;
@property (nonatomic) BOOL tsnTruncate;
@property (nonatomic, strong) UIColor *tsnResolvedColor;
- (instancetype)initWithString:(NSString *)string size:(CGFloat)size weight:(UIFontWeight)weight monospace:(BOOL)monospace;
- (void)tsnRefreshText;
@end

@implementation TSNTextLabel

- (instancetype)initWithString:(NSString *)string size:(CGFloat)size weight:(UIFontWeight)weight monospace:(BOOL)monospace {
    self = [super initWithFrame:CGRectZero];
    if (!self) return nil;
    _tsnRawText = [string copy] ?: @"";
    _tsnPointSize = size;
    _tsnWeight = weight;
    _tsnTracking = 0;
    _tsnLineHeightMultiplier = size > 0 ? (tsn_default_css_line_height_for_size(size) / size) : 1.2;
    _tsnTransform = TSNTextTransformKindNone;
    _tsnMonospace = monospace;
    _tsnTruncate = NO;
    _tsnResolvedColor = [UIColor labelColor];
    self.backgroundColor = [UIColor clearColor];
    self.numberOfLines = 0;
    [self tsnRefreshText];
    return self;
}

- (CGSize)intrinsicContentSize {
    return [self sizeThatFits:CGSizeMake(CGFLOAT_MAX, CGFLOAT_MAX)];
}

- (void)tsnRefreshText {
    NSString *text = self.tsnRawText ?: @"";
    if (self.tsnTransform == TSNTextTransformKindUppercase) text = [text uppercaseString];
    else if (self.tsnTransform == TSNTextTransformKindLowercase) text = [text lowercaseString];

    UIFont *font = tsn_text_font(self.tsnPointSize > 0 ? self.tsnPointSize : 14, self.tsnWeight, self.tsnMonospace);
    NSMutableParagraphStyle *paragraph = [NSMutableParagraphStyle new];
    paragraph.alignment = self.textAlignment;
    paragraph.lineBreakMode = self.tsnTruncate ? NSLineBreakByTruncatingTail : NSLineBreakByWordWrapping;
    CGFloat lineHeight = MAX(font.lineHeight, font.lineHeight * self.tsnLineHeightMultiplier);
    paragraph.minimumLineHeight = lineHeight;
    paragraph.maximumLineHeight = lineHeight;

    NSDictionary *attrs = @{
        NSFontAttributeName: font,
        NSKernAttributeName: @(self.tsnTracking),
        NSForegroundColorAttributeName: self.tsnResolvedColor ?: [UIColor labelColor],
        NSParagraphStyleAttributeName: paragraph,
    };

    self.numberOfLines = self.tsnTruncate ? 1 : 0;
    self.lineBreakMode = paragraph.lineBreakMode;
    self.attributedText = [[NSAttributedString alloc] initWithString:text attributes:attrs];
    [self invalidateIntrinsicContentSize];
    [self setNeedsLayout];
}

@end

@interface TSNClickTarget : NSObject
@property (nonatomic, assign) UIClickFn fn;
@property (nonatomic) int tag;
- (void)invokeControl:(id)sender;
- (void)invokeTap:(UITapGestureRecognizer *)gesture;
@end

@implementation TSNClickTarget
- (void)invokeControl:(__unused id)sender {
    if (self.fn) self.fn(self.tag);
}
- (void)invokeTap:(__unused UITapGestureRecognizer *)gesture {
    if (self.fn) self.fn(self.tag);
}
@end

@interface TSNShadowNode : NSObject
@property TSNNodeKind kind;
@property (nonatomic, strong) UIView *view;
@property (nonatomic, assign) YGNodeRef yogaNode;
@property (nonatomic, assign) BOOL ownsYogaNode;
@property (nonatomic, strong) NSMutableArray<TSNShadowNode *> *children;
@property (nonatomic, weak) TSNShadowNode *parent;
@property int direction;
@property int scrollAxis;
@property (nonatomic, strong) UIView *contentView;
@property (nonatomic, assign) YGNodeRef contentYogaNode;
@property (nonatomic, assign) BOOL ownsContentYogaNode;
@end

@implementation TSNShadowNode
- (instancetype)init {
    self = [super init];
    if (!self) return nil;
    _children = [NSMutableArray new];
    _scrollAxis = 0;
    return self;
}
- (void)dealloc {
    if (_ownsYogaNode && _yogaNode) {
        YGNodeFree(_yogaNode);
        _yogaNode = NULL;
    }
    if (_ownsContentYogaNode && _contentYogaNode) {
        YGNodeFree(_contentYogaNode);
        _contentYogaNode = NULL;
    }
}
@end

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
static __weak UIView *gResponsiveVariantView = nil;
static TSNResponsiveLayoutVariant *gResponsiveVariant = nil;

static TSNResponsiveLayoutState *tsn_responsive_layout_state(UIView *view, BOOL create) {
    TSNResponsiveLayoutState *state = objc_getAssociatedObject(view, &kResponsiveLayoutStateKey);
    if (!state && create) {
        state = [TSNResponsiveLayoutState new];
        objc_setAssociatedObject(view, &kResponsiveLayoutStateKey, state, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    }
    return state;
}

static BOOL tsn_is_recording_responsive_variant(UIView *view) {
    return gResponsiveVariantView != nil && gResponsiveVariantView == view && gResponsiveVariant != nil;
}

static TSNPendingLayoutStyle *tsn_current_layout_style(UIView *view, BOOL create) {
    TSNResponsiveLayoutState *state = tsn_responsive_layout_state(view, create);
    if (!state) return nil;
    if (tsn_is_recording_responsive_variant(view)) {
        if (!gResponsiveVariant.style && create) gResponsiveVariant.style = [TSNPendingLayoutStyle new];
        return gResponsiveVariant.style;
    }
    if (!state.baseStyle && create) state.baseStyle = [TSNPendingLayoutStyle new];
    return state.baseStyle;
}

static TSNResponsiveLayoutVariant *tsn_responsive_variant_for_min_width(UIView *view, CGFloat minWidth, BOOL create) {
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

static void tsn_apply_scroll_axis(TSNShadowNode *node, int axis) {
    if (!node) return;
    node.scrollAxis = axis;
    if (node.kind == TSNNodeKindScroll && [node.view isKindOfClass:[UIScrollView class]]) {
        UIScrollView *scrollView = (UIScrollView *)node.view;
        scrollView.alwaysBounceHorizontal = axis == 1;
        scrollView.alwaysBounceVertical = axis == 0;
        scrollView.showsHorizontalScrollIndicator = axis == 1;
        scrollView.showsVerticalScrollIndicator = axis == 0;
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
    YGNodeStyleSetWidth(yogaNode, YGUndefined);
    YGNodeStyleSetHeight(yogaNode, YGUndefined);
    YGNodeStyleSetMinWidth(yogaNode, YGUndefined);
    YGNodeStyleSetMinHeight(yogaNode, YGUndefined);
    YGNodeStyleSetMaxWidth(yogaNode, YGUndefined);
    YGNodeStyleSetMaxHeight(yogaNode, YGUndefined);
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

static void tsn_apply_length(YGNodeRef node, TSNLayoutLength length,
                             void (^pointSetter)(CGFloat),
                             void (^percentSetter)(CGFloat)) {
    if (!tsn_layout_length_is_set(length)) return;
    if (length.unit == TSNLayoutUnitPercent) percentSetter(length.value);
    else pointSetter(length.value);
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
    tsn_apply_length(yogaNode, style->width, ^(CGFloat value) { YGNodeStyleSetWidth(yogaNode, value); }, ^(CGFloat value) { YGNodeStyleSetWidthPercent(yogaNode, value); });
    tsn_apply_length(yogaNode, style->height, ^(CGFloat value) { YGNodeStyleSetHeight(yogaNode, value); }, ^(CGFloat value) { YGNodeStyleSetHeightPercent(yogaNode, value); });
    tsn_apply_length(yogaNode, style->minWidth, ^(CGFloat value) { YGNodeStyleSetMinWidth(yogaNode, value); }, ^(CGFloat value) { YGNodeStyleSetMinWidthPercent(yogaNode, value); });
    tsn_apply_length(yogaNode, style->minHeight, ^(CGFloat value) { YGNodeStyleSetMinHeight(yogaNode, value); }, ^(CGFloat value) { YGNodeStyleSetMinHeightPercent(yogaNode, value); });
    tsn_apply_length(yogaNode, style->maxWidth, ^(CGFloat value) { YGNodeStyleSetMaxWidth(yogaNode, value); }, ^(CGFloat value) { YGNodeStyleSetMaxWidthPercent(yogaNode, value); });
    tsn_apply_length(yogaNode, style->maxHeight, ^(CGFloat value) { YGNodeStyleSetMaxHeight(yogaNode, value); }, ^(CGFloat value) { YGNodeStyleSetMaxHeightPercent(yogaNode, value); });
    if (style->hasPositionType) {
        YGNodeStyleSetPositionType(yogaNode, style->positionType == 1 ? YGPositionTypeAbsolute : YGPositionTypeRelative);
    }
    tsn_apply_length(yogaNode, style->insetTop, ^(CGFloat value) { YGNodeStyleSetPosition(yogaNode, YGEdgeTop, value); }, ^(CGFloat value) { YGNodeStyleSetPositionPercent(yogaNode, YGEdgeTop, value); });
    tsn_apply_length(yogaNode, style->insetRight, ^(CGFloat value) { YGNodeStyleSetPosition(yogaNode, YGEdgeRight, value); }, ^(CGFloat value) { YGNodeStyleSetPositionPercent(yogaNode, YGEdgeRight, value); });
    tsn_apply_length(yogaNode, style->insetBottom, ^(CGFloat value) { YGNodeStyleSetPosition(yogaNode, YGEdgeBottom, value); }, ^(CGFloat value) { YGNodeStyleSetPositionPercent(yogaNode, YGEdgeBottom, value); });
    tsn_apply_length(yogaNode, style->insetLeft, ^(CGFloat value) { YGNodeStyleSetPosition(yogaNode, YGEdgeLeft, value); }, ^(CGFloat value) { YGNodeStyleSetPositionPercent(yogaNode, YGEdgeLeft, value); });
    if (style->hasAspectRatio && style->aspectRatio > 0) YGNodeStyleSetAspectRatio(yogaNode, style->aspectRatio);
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

static YGSize yoga_measure_func(YGNodeConstRef node, float width, YGMeasureMode widthMode,
                                float height, YGMeasureMode heightMode);

static TSNShadowNode *g_pending_window_node;
static TSNAppWindow *g_pending_window_model;
static TSNAppWindow *g_current_window_model;
static UIWindow *g_live_window;
static BOOL g_inspector_started = NO;

static NSString *tsn_kind_name(TSNShadowNode *node) {
    if (!node) return @"Unknown";
    switch (node.kind) {
        case TSNNodeKindView: return @"View";
        case TSNNodeKindVStack: return @"VStack";
        case TSNNodeKindHStack: return @"HStack";
        case TSNNodeKindZStack: return @"ZStack";
        case TSNNodeKindScroll: return @"ScrollView";
        default: break;
    }
    UIView *view = node.view;
    if ([view isKindOfClass:[TSNTextLabel class]]) return @"Text";
    if ([view isKindOfClass:[UITextField class]]) return @"Text";
    if ([view isKindOfClass:[UISearchBar class]]) return @"Search";
    if ([view isKindOfClass:[UIButton class]]) return @"Button";
    if ([view isKindOfClass:[UIImageView class]]) return @"Image";
    if ([view isKindOfClass:[TSNSpacerView class]]) return @"Spacer";
    if ([view isKindOfClass:[UIProgressView class]]) return @"Progress";
    if ([view accessibilityIdentifier] && [[view accessibilityIdentifier] isEqualToString:@"__tsn_divider__"]) return @"Divider";
    return NSStringFromClass([view class]);
}

static TSNShadowNode *tsn_shadow_node_for_obj(id obj) {
    return objc_getAssociatedObject(obj, &kTSNShadowNodeKey);
}

static void tsn_set_shadow_node_for_obj(id obj, TSNShadowNode *node) {
    objc_setAssociatedObject(obj, &kTSNShadowNodeKey, node, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

static TSNShadowNode *tsn_shadow_node_for_handle(UIHandle handle) {
    id obj = (__bridge id)handle;
    return tsn_shadow_node_for_obj(obj);
}

static UIView *tsn_view_for_handle(UIHandle handle) {
    id obj = (__bridge id)handle;
    if ([obj isKindOfClass:[UIView class]]) return (UIView *)obj;
    return nil;
}

static YGNodeRef tsn_create_yoga_node(UIView *view, BOOL measurable, int direction) {
    YGNodeRef node = YGNodeNew();
    YGNodeSetContext(node, (__bridge void *)view);
    if (measurable) YGNodeSetMeasureFunc(node, yoga_measure_func);
    if (direction == 1) YGNodeStyleSetFlexDirection(node, YGFlexDirectionRow);
    else YGNodeStyleSetFlexDirection(node, YGFlexDirectionColumn);
    YGNodeStyleSetAlignItems(node, YGAlignStretch);
    return node;
}

static void tsn_apply_aspect_ratio_if_present(UIView *view, YGNodeRef yogaNode) {
    NSValue *aspectVal = objc_getAssociatedObject(view, &kAspectRatioKey);
    if (!aspectVal || !yogaNode) return;
    CGSize ratio = [aspectVal CGSizeValue];
    if (ratio.width > 0 && ratio.height > 0) {
        YGNodeStyleSetAspectRatio(yogaNode, ratio.width / ratio.height);
    }
}

static BOOL tsn_is_card_container(UIView *view) {
    NSNumber *value = objc_getAssociatedObject(view, &kCardContainerKey);
    return value ? value.boolValue : NO;
}

static TSNShadowNode *tsn_create_view_node(UIView *view, TSNNodeKind kind, int direction, BOOL measurable) {
    TSNShadowNode *node = [TSNShadowNode new];
    node.kind = kind;
    node.view = view;
    node.direction = direction;
    node.yogaNode = tsn_create_yoga_node(view, measurable, direction);
    node.ownsYogaNode = YES;
    if (!measurable) {
        CGFloat fw = CGRectGetWidth(view.frame);
        CGFloat fh = CGRectGetHeight(view.frame);
        if (fw > 0) YGNodeStyleSetWidth(node.yogaNode, fw);
        if (fh > 0) YGNodeStyleSetHeight(node.yogaNode, fh);
    }
    tsn_apply_aspect_ratio_if_present(view, node.yogaNode);
    tsn_set_shadow_node_for_obj(view, node);
    return node;
}

static TSNShadowNode *tsn_create_container_node(UIView *view, TSNNodeKind kind, int direction) {
    return tsn_create_view_node(view, kind, direction, NO);
}

static TSNShadowNode *tsn_create_scroll_node(UIScrollView *scrollView) {
    TSNShadowNode *node = tsn_create_view_node(scrollView, TSNNodeKindScroll, 0, NO);
    YGNodeSetMeasureFunc(node.yogaNode, yoga_measure_func);
    TSNContainerView *content = [TSNContainerView new];
    content.backgroundColor = [UIColor clearColor];
    [scrollView addSubview:content];
    node.contentView = content;
    node.contentYogaNode = tsn_create_yoga_node(content, NO, 0);
    node.ownsContentYogaNode = YES;
    return node;
}

static YGNodeRef tsn_layout_root_for_parent(TSNShadowNode *node) {
    if (!node) return NULL;
    if (node.kind == TSNNodeKindScroll) return node.contentYogaNode;
    return node.yogaNode;
}

static UIView *tsn_host_container_for_parent(TSNShadowNode *node) {
    if (!node) return nil;
    if (node.kind == TSNNodeKindScroll) return node.contentView;
    return node.view;
}

static void tsn_apply_zstack_constraints_if_needed(TSNShadowNode *parent, YGNodeRef childYoga) {
    if (!parent || !childYoga || parent.direction != 2) return;
    YGNodeStyleSetPositionType(childYoga, YGPositionTypeAbsolute);
    YGNodeStyleSetPosition(childYoga, YGEdgeLeft, 0);
    YGNodeStyleSetPosition(childYoga, YGEdgeTop, 0);
    YGNodeStyleSetWidthPercent(childYoga, 100);
    YGNodeStyleSetHeightPercent(childYoga, 100);
}

static void tsn_collect_layout_extents(TSNShadowNode *node, YGNodeRef parentYoga,
                                       CGFloat originX, CGFloat originY,
                                       CGFloat *maxX, CGFloat *maxY) {
    if (!node || !parentYoga) return;
    NSUInteger childCount = node.children.count;
    for (NSUInteger i = 0; i < childCount; i++) {
        TSNShadowNode *child = node.children[i];
        YGNodeRef childYoga = YGNodeGetChild(parentYoga, (uint32_t)i);
        if (!childYoga) continue;

        CGFloat childX = originX + YGNodeLayoutGetLeft(childYoga);
        CGFloat childY = originY + YGNodeLayoutGetTop(childYoga);
        CGFloat childW = YGNodeLayoutGetWidth(childYoga);
        CGFloat childH = YGNodeLayoutGetHeight(childYoga);

        if (childX + childW > *maxX) *maxX = childX + childW;
        if (childY + childH > *maxY) *maxY = childY + childH;

        if (child.kind != TSNNodeKindScroll && child.children.count > 0) {
            tsn_collect_layout_extents(child, child.yogaNode, childX, childY, maxX, maxY);
        }
    }
}

static void tsn_attach_child_nodes(TSNShadowNode *parent, TSNShadowNode *child) {
    if (!parent || !child) return;
    if (child.parent == parent) return;
    if (child.parent) {
        TSNShadowNode *oldParent = child.parent;
        NSUInteger oldIndex = [oldParent.children indexOfObjectIdenticalTo:child];
        if (oldIndex != NSNotFound) [oldParent.children removeObjectAtIndex:oldIndex];
        YGNodeRef oldRoot = tsn_layout_root_for_parent(oldParent);
        if (oldRoot && child.yogaNode) YGNodeRemoveChild(oldRoot, child.yogaNode);
    }

    child.parent = parent;
    [parent.children addObject:child];

    UIView *host = tsn_host_container_for_parent(parent);
    if (host && child.view.superview != host) [host addSubview:child.view];

    YGNodeRef layoutRoot = tsn_layout_root_for_parent(parent);
    if (layoutRoot && child.yogaNode) {
        uint32_t idx = (uint32_t)YGNodeGetChildCount(layoutRoot);
        YGNodeInsertChild(layoutRoot, child.yogaNode, idx);
        tsn_apply_zstack_constraints_if_needed(parent, child.yogaNode);
        if (tsn_is_card_container(parent.view) && [child.view isKindOfClass:[TSNTextLabel class]]) {
            YGNodeStyleSetAlignSelf(child.yogaNode, YGAlignFlexStart);
        }
        if ([child.view accessibilityIdentifier] && [[child.view accessibilityIdentifier] isEqualToString:@"__tsn_divider__"]) {
            if (parent.direction == 1) {
                YGNodeStyleSetWidth(child.yogaNode, 1);
                if (YGNodeStyleGetHeight(child.yogaNode).unit == YGUnitUndefined) {
                    YGNodeStyleSetHeight(child.yogaNode, 40);
                }
                YGNodeStyleSetAlignSelf(child.yogaNode, YGAlignCenter);
            } else {
                YGNodeStyleSetHeight(child.yogaNode, 1);
                YGNodeStyleSetAlignSelf(child.yogaNode, YGAlignStretch);
            }
        }
    }
}

static void tsn_sync_view_layers(UIView *view) {
    CAGradientLayer *gradient = objc_getAssociatedObject(view, &kGradientLayerKey);
    if (gradient) {
        gradient.frame = view.bounds;
        gradient.cornerRadius = view.layer.cornerRadius;
    }
}

static void tsn_apply_layout_recursive(TSNShadowNode *node, YGNodeRef parentYoga);

static CGFloat tsn_sanitize_layout_value(CGFloat value) {
    if (!isfinite(value)) return 0;
    return value;
}

static void tsn_layout_scroll_node(TSNShadowNode *node) {
    if (!node || node.kind != TSNNodeKindScroll) return;
    UIScrollView *scrollView = (UIScrollView *)node.view;
    CGFloat viewportWidth = CGRectGetWidth(scrollView.bounds);
    CGFloat viewportHeight = CGRectGetHeight(scrollView.bounds);
    if (viewportWidth <= 0 || viewportHeight <= 0) return;

    if (node.scrollAxis == 1) {
        YGNodeCalculateLayout(node.contentYogaNode, YGUndefined, viewportHeight, YGDirectionLTR);
        CGFloat maxX = viewportWidth;
        CGFloat maxY = viewportHeight;
        tsn_collect_layout_extents(node, node.contentYogaNode, 0, 0, &maxX, &maxY);
        node.contentView.frame = CGRectMake(0, 0, maxX, MAX(viewportHeight, maxY));
        scrollView.contentSize = node.contentView.frame.size;
    } else {
        YGNodeCalculateLayout(node.contentYogaNode, viewportWidth, YGUndefined, YGDirectionLTR);
        CGFloat maxX = viewportWidth;
        CGFloat maxY = viewportHeight;
        tsn_collect_layout_extents(node, node.contentYogaNode, 0, 0, &maxX, &maxY);
        node.contentView.frame = CGRectMake(0, 0, MAX(viewportWidth, maxX), maxY);
        scrollView.contentSize = node.contentView.frame.size;
    }

    tsn_sync_view_layers(node.contentView);
    tsn_apply_layout_recursive(node, node.contentYogaNode);
}

static void tsn_apply_layout_recursive(TSNShadowNode *node, YGNodeRef parentYoga) {
    NSUInteger childCount = node.children.count;
    for (NSUInteger i = 0; i < childCount; i++) {
        TSNShadowNode *child = node.children[i];
        YGNodeRef childYoga = parentYoga ? YGNodeGetChild(parentYoga, (uint32_t)i) : NULL;
        if (!childYoga) continue;

        CGFloat x = tsn_sanitize_layout_value(YGNodeLayoutGetLeft(childYoga));
        CGFloat y = tsn_sanitize_layout_value(YGNodeLayoutGetTop(childYoga));
        CGFloat w = tsn_sanitize_layout_value(YGNodeLayoutGetWidth(childYoga));
        CGFloat h = tsn_sanitize_layout_value(YGNodeLayoutGetHeight(childYoga));
        if (w < 0) w = 0;
        if (h < 0) h = 0;
        child.view.frame = CGRectMake(x, y, w, h);
        tsn_sync_view_layers(child.view);

        if (child.kind == TSNNodeKindScroll) {
            tsn_layout_scroll_node(child);
        } else if (child.children.count > 0) {
            tsn_apply_layout_recursive(child, child.yogaNode);
        }
    }
}

static void tsn_commit_root_layout(TSNShadowNode *node, CGSize size) {
    if (!node || !node.yogaNode) return;
    tsn_apply_responsive_layout_tree(node, size.width);
    YGNodeCalculateLayout(node.yogaNode, size.width, size.height, YGDirectionLTR);
    tsn_apply_layout_recursive(node, node.yogaNode);
}

static void tsn_commit_app_window_layout(TSNAppWindow *windowModel, CGSize size) {
    if (!windowModel || !windowModel.rootNode || !windowModel.rootView) return;
    windowModel.rootView.frame = CGRectMake(0, 0, size.width, size.height);
    tsn_sync_view_layers(windowModel.rootView);
    tsn_commit_root_layout(windowModel.rootNode, size);
}

static CGSize tsn_measure_label(UILabel *label, CGFloat maxWidth) {
    CGSize constraint = CGSizeMake(maxWidth > 0 ? maxWidth : CGFLOAT_MAX, CGFLOAT_MAX);
    CGSize size = [label sizeThatFits:constraint];
    return CGSizeMake(ceil(size.width), ceil(size.height));
}

static YGSize yoga_measure_func(YGNodeConstRef node, float width, YGMeasureMode widthMode,
                                float height, YGMeasureMode heightMode) {
    UIView *view = (__bridge UIView *)YGNodeGetContext((YGNodeRef)node);
    YGSize result = { .width = 0, .height = 0 };

    CGFloat availableWidth = (widthMode == YGMeasureModeUndefined) ? CGFLOAT_MAX : width;
    CGFloat availableHeight = (heightMode == YGMeasureModeUndefined) ? CGFLOAT_MAX : height;

    if ([view isKindOfClass:[UILabel class]]) {
        CGSize size = tsn_measure_label((UILabel *)view, availableWidth);
        result.width = (widthMode == YGMeasureModeExactly) ? width : size.width;
        result.height = (heightMode == YGMeasureModeExactly) ? height : size.height;
    } else if ([view isKindOfClass:[UIButton class]]) {
        CGSize size = [((UIButton *)view) sizeThatFits:CGSizeMake(availableWidth, availableHeight)];
        result.width = (widthMode == YGMeasureModeExactly) ? width : ceil(size.width);
        result.height = (heightMode == YGMeasureModeExactly) ? height : ceil(MAX(size.height, 24));
    } else if ([view isKindOfClass:[UIImageView class]]) {
        UIImage *image = ((UIImageView *)view).image;
        CGSize natural = image ? image.size : CGSizeMake(100, 100);
        CGFloat frameW = CGRectGetWidth(view.frame);
        CGFloat frameH = CGRectGetHeight(view.frame);
        result.width = frameW > 0 ? frameW : natural.width;
        result.height = frameH > 0 ? frameH : natural.height;
    } else if ([view isKindOfClass:[UIScrollView class]]) {
        TSNShadowNode *shadow = tsn_shadow_node_for_obj(view);
        if (shadow && shadow.contentYogaNode) {
            if (shadow.scrollAxis == 1) {
                float calcHeight = (heightMode == YGMeasureModeUndefined) ? YGUndefined : availableHeight;
                YGNodeCalculateLayout(shadow.contentYogaNode, YGUndefined, calcHeight, YGDirectionLTR);
            } else {
                float calcWidth = (widthMode == YGMeasureModeUndefined) ? YGUndefined : availableWidth;
                YGNodeCalculateLayout(shadow.contentYogaNode, calcWidth, YGUndefined, YGDirectionLTR);
            }
            CGFloat contentWidth = YGNodeLayoutGetWidth(shadow.contentYogaNode);
            CGFloat contentHeight = YGNodeLayoutGetHeight(shadow.contentYogaNode);
            result.width = (widthMode == YGMeasureModeExactly) ? width : MIN(contentWidth, availableWidth);
            result.height = (heightMode == YGMeasureModeExactly) ? height : MIN(contentHeight, availableHeight);
        } else {
            result.width = widthMode == YGMeasureModeUndefined ? 160 : width;
            result.height = heightMode == YGMeasureModeUndefined ? 96 : height;
        }
    } else if ([view isKindOfClass:[UIProgressView class]]) {
        result.width = (widthMode == YGMeasureModeUndefined) ? 120 : width;
        result.height = (heightMode == YGMeasureModeUndefined) ? 4 : height;
    } else {
        CGSize size = view.intrinsicContentSize;
        CGFloat frameW = CGRectGetWidth(view.frame);
        CGFloat frameH = CGRectGetHeight(view.frame);
        CGFloat measuredWidth = frameW > 0 ? frameW : (size.width > 0 ? size.width : 60);
        CGFloat measuredHeight = frameH > 0 ? frameH : (size.height > 0 ? size.height : 24);
        result.width = (widthMode == YGMeasureModeExactly) ? width : measuredWidth;
        result.height = (heightMode == YGMeasureModeExactly) ? height : measuredHeight;
    }

    return result;
}

@interface TSNRootViewController : UIViewController
@property (nonatomic, strong) TSNAppWindow *currentWindowModel;
- (void)mountAppWindow:(TSNAppWindow *)windowModel;
@end

@implementation TSNRootViewController

- (void)loadView {
    TSNContainerView *view = [TSNContainerView new];
    view.backgroundColor = [UIColor systemBackgroundColor];
    self.view = view;
}

- (void)mountAppWindow:(TSNAppWindow *)windowModel {
    self.currentWindowModel = windowModel;
    g_current_window_model = windowModel;
    self.view.backgroundColor = windowModel.dark ? [UIColor colorWithWhite:0.06 alpha:1] : [UIColor systemBackgroundColor];
    g_live_window.overrideUserInterfaceStyle = windowModel.dark ? UIUserInterfaceStyleDark : UIUserInterfaceStyleLight;

    for (UIView *subview in [self.view.subviews copy]) {
        [subview removeFromSuperview];
    }

    if (windowModel.rootView) {
        [self.view addSubview:windowModel.rootView];
        windowModel.rootView.frame = self.view.bounds;
    }

    [self.view setNeedsLayout];
    [self.view layoutIfNeeded];
    tsn_commit_app_window_layout(windowModel, self.view.bounds.size);
    finish_render_cycle();
}

- (void)viewDidLayoutSubviews {
    [super viewDidLayoutSubviews];
    if (self.currentWindowModel) {
        tsn_commit_app_window_layout(self.currentWindowModel, self.view.bounds.size);
    }
}

@end

@interface TSNAppDelegate : UIResponder <UIApplicationDelegate>
@property (nonatomic, strong) UIWindow *window;
@property (nonatomic, strong) TSNRootViewController *rootController;
@end

@implementation TSNAppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
    self.rootController = [TSNRootViewController new];
    g_live_window = self.window;
    self.window.rootViewController = self.rootController;
    [self.window makeKeyAndVisible];
    if (g_pending_window_model) {
        [self.rootController mountAppWindow:g_pending_window_model];
    }
    ui_inspector_start();
    return YES;
}
@end

static inline void retain_render(id obj) {
    if (obj) [g_render_retained addObject:obj];
}

static inline void retain_persistent(id obj) {
    if (obj) [g_persistent_retained addObject:obj];
}

static void finish_render_cycle(void) {
    [g_render_retained removeAllObjects];
}

static UIColor *tsn_rgb_color(double r, double g, double b, double a) {
    return [UIColor colorWithRed:r green:g blue:b alpha:a];
}

static void tsn_apply_button_style(UIButton *button, int style) {
    NSString *trimmed = [[button titleForState:UIControlStateNormal] ?: @"" stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
    UIColor *bg = [UIColor colorWithWhite:0.16 alpha:1];
    UIColor *fg = [UIColor colorWithWhite:0.92 alpha:1];
    CGFloat radius = 10;
    CGFloat top = 6, left = 12, bottom = 6, right = 12;
    UIFontWeight weight = UIFontWeightMedium;

    switch (style) {
        case 1:
            bg = [UIColor whiteColor];
            fg = [UIColor blackColor];
            radius = 999;
            top = 8; left = 20; bottom = 8; right = 20;
            weight = UIFontWeightSemibold;
            trimmed = [NSString stringWithFormat:@"  %@  ", trimmed];
            break;
        case 2:
            bg = [UIColor systemRedColor];
            fg = [UIColor whiteColor];
            radius = 999;
            top = 8; left = 16; bottom = 8; right = 16;
            weight = UIFontWeightSemibold;
            trimmed = [NSString stringWithFormat:@"  %@  ", trimmed];
            break;
        case 3:
            bg = [UIColor clearColor];
            fg = [UIColor systemBlueColor];
            radius = 0;
            top = 4; left = 6; bottom = 4; right = 6;
            weight = UIFontWeightSemibold;
            break;
        case 4:
            bg = [UIColor clearColor];
            fg = [UIColor colorWithWhite:0.88 alpha:1];
            radius = 6;
            top = 10; left = 12; bottom = 10; right = 12;
            weight = UIFontWeightMedium;
            break;
        case 5:
            bg = [UIColor colorWithWhite:0.22 alpha:1];
            fg = [UIColor systemBlueColor];
            radius = 6;
            top = 10; left = 12; bottom = 10; right = 12;
            weight = UIFontWeightSemibold;
            break;
        case 6:
            bg = [UIColor whiteColor];
            fg = [UIColor systemBlueColor];
            radius = 999;
            top = 4; left = 16; bottom = 4; right = 16;
            weight = UIFontWeightSemibold;
            trimmed = [NSString stringWithFormat:@"  %@  ", trimmed];
            break;
        case 7:
            bg = [UIColor colorWithWhite:0.25 alpha:1];
            fg = [UIColor colorWithWhite:0.92 alpha:1];
            radius = 999;
            top = 5; left = 12; bottom = 5; right = 12;
            weight = UIFontWeightSemibold;
            break;
        default:
            break;
    }

    button.backgroundColor = bg;
    button.tintColor = fg;
    button.layer.cornerRadius = radius;
    button.layer.masksToBounds = radius > 0;
    button.contentEdgeInsets = UIEdgeInsetsMake(top, left, bottom, right);
    [button setTitle:trimmed forState:UIControlStateNormal];
    [button setTitleColor:fg forState:UIControlStateNormal];
    button.titleLabel.font = [UIFont systemFontOfSize:13 weight:weight];
}

static UIImage *tsn_load_image(NSString *source) {
    if (source.length == 0) return nil;

    if ([source hasPrefix:@"http://"] || [source hasPrefix:@"https://"]) {
        NSData *data = [NSData dataWithContentsOfURL:[NSURL URLWithString:source]];
        return data ? [UIImage imageWithData:data] : nil;
    }

    UIImage *image = nil;
    if ([source hasPrefix:@"/"]) {
        image = [UIImage imageWithContentsOfFile:source];
        if (image) return image;
    }

    NSString *bundlePath = [[NSBundle mainBundle] bundlePath];
    image = [UIImage imageWithContentsOfFile:[bundlePath stringByAppendingPathComponent:source]];
    if (image) return image;

    NSString *resourcePath = [[NSBundle mainBundle] resourcePath];
    image = [UIImage imageWithContentsOfFile:[resourcePath stringByAppendingPathComponent:source]];
    if (image) return image;

    NSString *cwd = [[NSFileManager defaultManager] currentDirectoryPath];
    image = [UIImage imageWithContentsOfFile:[cwd stringByAppendingPathComponent:source]];
    if (image) return image;

    NSString *basename = [source lastPathComponent];
    image = [UIImage imageNamed:basename];
    return image;
}

void ui_init(void) {
    g_render_retained = [NSMutableArray new];
    g_persistent_retained = [NSMutableArray new];
    g_element_ids = [NSMutableDictionary new];
}

void ui_run(UIHandle root) {
    g_pending_window_model = (__bridge TSNAppWindow *)root;
    int argc = 1;
    char *argv[] = { (char *)"tsn-ios-app", NULL };
    UIApplicationMain(argc, argv, nil, NSStringFromClass([TSNAppDelegate class]));
}

void ui_replace_root(UIHandle root) {
    g_pending_window_model = (__bridge TSNAppWindow *)root;
    id<UIApplicationDelegate> delegate = UIApplication.sharedApplication.delegate;
    if ([delegate isKindOfClass:[TSNAppDelegate class]]) {
        TSNAppDelegate *appDelegate = (TSNAppDelegate *)delegate;
        [appDelegate.rootController mountAppWindow:g_pending_window_model];
    }
}

UIHandle ui_window(const char *title, int w, int h, bool dark) {
    TSNAppWindow *windowModel = [TSNAppWindow new];
    windowModel.title = [NSString stringWithUTF8String:title ?: "App"];
    windowModel.subtitle = @"";
    windowModel.dark = dark;
    retain_persistent(windowModel);
    return (__bridge UIHandle)windowModel;
}

void ui_window_subtitle(UIHandle w, const char *sub) {
    TSNAppWindow *windowModel = (__bridge TSNAppWindow *)w;
    if ([windowModel isKindOfClass:[TSNAppWindow class]]) {
        windowModel.subtitle = sub ? [NSString stringWithUTF8String:sub] : @"";
    }
}

void ui_window_toolbar(UIHandle w, bool visible) { (void)w; (void)visible; }
void ui_window_titlebar_transparent(UIHandle w) { (void)w; }
void ui_window_fullsize_content(UIHandle w) { (void)w; }

UIHandle ui_vstack(void) {
    TSNContainerView *view = [TSNContainerView new];
    view.backgroundColor = [UIColor clearColor];
    tsn_create_container_node(view, TSNNodeKindVStack, 0);
    retain_render(view);
    return (__bridge UIHandle)view;
}

UIHandle ui_hstack(void) {
    TSNContainerView *view = [TSNContainerView new];
    view.backgroundColor = [UIColor clearColor];
    tsn_create_container_node(view, TSNNodeKindHStack, 1);
    retain_render(view);
    return (__bridge UIHandle)view;
}

UIHandle ui_zstack(void) {
    TSNContainerView *view = [TSNContainerView new];
    view.backgroundColor = [UIColor clearColor];
    view.clipsToBounds = YES;
    tsn_create_container_node(view, TSNNodeKindZStack, 2);
    retain_render(view);
    return (__bridge UIHandle)view;
}

UIHandle ui_view(void) {
    TSNContainerView *view = [TSNContainerView new];
    view.backgroundColor = [UIColor clearColor];
    tsn_create_container_node(view, TSNNodeKindView, 0);
    retain_render(view);
    return (__bridge UIHandle)view;
}

void ui_set_clip(UIHandle v, int clip) {
    UIView *view = tsn_view_for_handle(v);
    if (!view) return;
    view.clipsToBounds = (clip != 0);
    view.layer.masksToBounds = (clip != 0);
}

void ui_set_aspect(UIHandle v, int w, int h) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow || h == 0) return;
    NSValue *val = [NSValue valueWithCGSize:CGSizeMake(w, h)];
    objc_setAssociatedObject(view, &kAspectRatioKey, val, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    style->hasAspectRatio = YES;
    style->aspectRatio = (CGFloat)w / (CGFloat)h;
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_gradient(UIHandle v, double r1, double g1, double b1, double a1,
                     double r2, double g2, double b2, double a2, int direction) {
    UIView *view = tsn_view_for_handle(v);
    if (!view) return;
    CAGradientLayer *gradient = objc_getAssociatedObject(view, &kGradientLayerKey);
    if (!gradient) {
        gradient = [CAGradientLayer layer];
        [view.layer insertSublayer:gradient atIndex:0];
        objc_setAssociatedObject(view, &kGradientLayerKey, gradient, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    }
    gradient.colors = @[
        (id)tsn_rgb_color(r1, g1, b1, a1).CGColor,
        (id)tsn_rgb_color(r2, g2, b2, a2).CGColor,
    ];
    if (direction == 0) { gradient.startPoint = CGPointMake(0.5, 1); gradient.endPoint = CGPointMake(0.5, 0); }
    else if (direction == 1) { gradient.startPoint = CGPointMake(0.5, 0); gradient.endPoint = CGPointMake(0.5, 1); }
    else if (direction == 2) { gradient.startPoint = CGPointMake(1, 0.5); gradient.endPoint = CGPointMake(0, 0.5); }
    else { gradient.startPoint = CGPointMake(0, 0.5); gradient.endPoint = CGPointMake(1, 0.5); }
    tsn_sync_view_layers(view);
}

void ui_set_padding(UIHandle v, int top, int right, int bottom, int left) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    style->hasPadding = YES;
    style->paddingTop = top;
    style->paddingRight = right;
    style->paddingBottom = bottom;
    style->paddingLeft = left;
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_margin(UIHandle v, int top, int right, int bottom, int left) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    style->hasMargin = YES;
    style->marginTop = top;
    style->marginRight = right;
    style->marginBottom = bottom;
    style->marginLeft = left;
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_spacing(UIHandle v, int spacing) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    style->hasSpacing = YES;
    style->spacing = spacing;
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_flex(UIHandle v, int flex) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    style->hasFlex = YES;
    style->flex = flex;
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_size(UIHandle v, int w, int h) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    if (w >= 0) style->width = tsn_layout_length_point(w);
    if (h >= 0) style->height = tsn_layout_length_point(h);
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_size_pct(UIHandle v, double w, double h) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    if (w >= 0) style->width = tsn_layout_length_percent(w);
    if (h >= 0) style->height = tsn_layout_length_percent(h);
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_min_size(UIHandle v, int w, int h) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    if (w >= 0) style->minWidth = tsn_layout_length_point(w);
    if (h >= 0) style->minHeight = tsn_layout_length_point(h);
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_min_size_pct(UIHandle v, double w, double h) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    if (w >= 0) style->minWidth = tsn_layout_length_percent(w);
    if (h >= 0) style->minHeight = tsn_layout_length_percent(h);
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_max_size(UIHandle v, int w, int h) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    if (w >= 0) style->maxWidth = tsn_layout_length_point(w);
    if (h >= 0) style->maxHeight = tsn_layout_length_point(h);
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_max_size_pct(UIHandle v, double w, double h) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    if (w >= 0) style->maxWidth = tsn_layout_length_percent(w);
    if (h >= 0) style->maxHeight = tsn_layout_length_percent(h);
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_position_type(UIHandle v, int position) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    style->hasPositionType = YES;
    style->positionType = position;
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_inset(UIHandle v, int top, int right, int bottom, int left) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    if (top >= 0) style->insetTop = tsn_layout_length_point(top);
    if (right >= 0) style->insetRight = tsn_layout_length_point(right);
    if (bottom >= 0) style->insetBottom = tsn_layout_length_point(bottom);
    if (left >= 0) style->insetLeft = tsn_layout_length_point(left);
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_inset_pct(UIHandle v, double top, double right, double bottom, double left) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    if (top >= 0) style->insetTop = tsn_layout_length_percent(top);
    if (right >= 0) style->insetRight = tsn_layout_length_percent(right);
    if (bottom >= 0) style->insetBottom = tsn_layout_length_percent(bottom);
    if (left >= 0) style->insetLeft = tsn_layout_length_percent(left);
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_alignment(UIHandle v, int align) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    style->hasAlignSelf = YES;
    style->alignSelf = align;
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_margin_auto(UIHandle v) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    style->hasMarginAuto = YES;
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_align_items(UIHandle v, int align) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    style->hasAlignItems = YES;
    style->alignItems = align;
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_set_justify_content(UIHandle v, int just) {
    UIView *view = tsn_view_for_handle(v);
    TSNShadowNode *shadow = tsn_shadow_node_for_handle(v);
    if (!view || !shadow) return;
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    style->hasJustifyContent = YES;
    style->justifyContent = just;
    if (!tsn_is_recording_responsive_variant(view)) tsn_apply_layout_style(shadow, style);
}

void ui_variant_begin_min_width(UIHandle v, double min_width) {
    UIView *view = tsn_view_for_handle(v);
    if (!view) return;
    gResponsiveVariantView = view;
    gResponsiveVariant = tsn_responsive_variant_for_min_width(view, min_width, YES);
}

void ui_variant_end(UIHandle v) {
    UIView *view = tsn_view_for_handle(v);
    if (view && view == gResponsiveVariantView) {
        gResponsiveVariantView = nil;
        gResponsiveVariant = nil;
    }
}

void ui_add_child(UIHandle parent, UIHandle child) {
    id parentObj = (__bridge id)parent;
    if ([parentObj isKindOfClass:[TSNAppWindow class]]) {
        TSNAppWindow *windowModel = (TSNAppWindow *)parentObj;
        windowModel.rootView = tsn_view_for_handle(child);
        windowModel.rootNode = tsn_shadow_node_for_handle(child);
        return;
    }

    TSNShadowNode *parentNode = tsn_shadow_node_for_handle(parent);
    TSNShadowNode *childNode = tsn_shadow_node_for_handle(child);
    tsn_attach_child_nodes(parentNode, childNode);
}

UIHandle ui_spacer(void) {
    TSNSpacerView *view = [TSNSpacerView new];
    view.backgroundColor = [UIColor clearColor];
    TSNShadowNode *node = tsn_create_view_node(view, TSNNodeKindLeaf, 0, NO);
    YGNodeStyleSetFlexGrow(node.yogaNode, 1);
    YGNodeStyleSetFlexShrink(node.yogaNode, 1);
    YGNodeStyleSetFlexBasis(node.yogaNode, 0);
    retain_render(view);
    return (__bridge UIHandle)view;
}

UIHandle ui_divider(void) {
    UIView *view = [UIView new];
    view.backgroundColor = [UIColor colorWithWhite:1 alpha:0.08];
    view.accessibilityIdentifier = @"__tsn_divider__";
    TSNShadowNode *node = tsn_create_view_node(view, TSNNodeKindLeaf, 0, NO);
    YGNodeStyleSetHeight(node.yogaNode, 1);
    retain_render(view);
    return (__bridge UIHandle)view;
}

UIHandle ui_blur_view(int material) { (void)material; return ui_view(); }

UIHandle ui_text(const char *content, int size, bool bold) {
    TSNTextLabel *label = [[TSNTextLabel alloc] initWithString:[NSString stringWithUTF8String:content ?: ""]
                                                          size:size
                                                        weight:(bold ? UIFontWeightBold : UIFontWeightRegular)
                                                     monospace:NO];
    tsn_create_view_node(label, TSNNodeKindLeaf, 0, YES);
    retain_render(label);
    return (__bridge UIHandle)label;
}

UIHandle ui_text_mono(const char *content, int size, bool bold) {
    TSNTextLabel *label = [[TSNTextLabel alloc] initWithString:[NSString stringWithUTF8String:content ?: ""]
                                                          size:size
                                                        weight:(bold ? UIFontWeightBold : UIFontWeightRegular)
                                                     monospace:YES];
    tsn_create_view_node(label, TSNNodeKindLeaf, 0, YES);
    retain_render(label);
    return (__bridge UIHandle)label;
}

void ui_text_set_color_rgb(UIHandle t, double r, double g, double b, double a) {
    UIView *view = tsn_view_for_handle(t);
    if ([view isKindOfClass:[TSNTextLabel class]]) {
        TSNTextLabel *label = (TSNTextLabel *)view;
        label.tsnResolvedColor = tsn_rgb_color(r, g, b, a);
        [label tsnRefreshText];
    }
}

void ui_text_set_color_system(UIHandle t, int color) {
    UIView *view = tsn_view_for_handle(t);
    if ([view isKindOfClass:[TSNTextLabel class]]) {
        TSNTextLabel *label = (TSNTextLabel *)view;
        label.tsnResolvedColor = system_color(color);
        [label tsnRefreshText];
    }
}

void ui_text_set_selectable(UIHandle t, bool sel) { (void)t; (void)sel; }

void ui_text_set_weight(UIHandle t, int weight) {
    UIView *view = tsn_view_for_handle(t);
    if ([view isKindOfClass:[TSNTextLabel class]]) {
        TSNTextLabel *label = (TSNTextLabel *)view;
        label.tsnWeight = tsn_font_weight_from_index(weight);
        [label tsnRefreshText];
    }
}

void ui_text_set_line_height(UIHandle t, double mult) {
    UIView *view = tsn_view_for_handle(t);
    if ([view isKindOfClass:[TSNTextLabel class]]) {
        TSNTextLabel *label = (TSNTextLabel *)view;
        label.tsnLineHeightMultiplier = mult;
        [label tsnRefreshText];
    }
}

void ui_text_set_tracking(UIHandle t, double kern) {
    UIView *view = tsn_view_for_handle(t);
    if ([view isKindOfClass:[TSNTextLabel class]]) {
        TSNTextLabel *label = (TSNTextLabel *)view;
        label.tsnTracking = kern;
        [label tsnRefreshText];
    }
}

void ui_text_set_transform(UIHandle t, int xform) {
    UIView *view = tsn_view_for_handle(t);
    if ([view isKindOfClass:[TSNTextLabel class]]) {
        TSNTextLabel *label = (TSNTextLabel *)view;
        label.tsnTransform = (TSNTextTransformKind)xform;
        [label tsnRefreshText];
    }
}

void ui_text_set_align(UIHandle t, int align) {
    UIView *view = tsn_view_for_handle(t);
    if ([view isKindOfClass:[TSNTextLabel class]]) {
        TSNTextLabel *label = (TSNTextLabel *)view;
        if (align == 1) label.textAlignment = NSTextAlignmentCenter;
        else if (align == 2) label.textAlignment = NSTextAlignmentRight;
        else label.textAlignment = NSTextAlignmentLeft;
        [label tsnRefreshText];
    }
}

void ui_text_set_truncate(UIHandle t) {
    UIView *view = tsn_view_for_handle(t);
    if ([view isKindOfClass:[TSNTextLabel class]]) {
        TSNTextLabel *label = (TSNTextLabel *)view;
        label.tsnTruncate = YES;
        [label tsnRefreshText];
    }
}

UIHandle ui_label(const char *content) {
    UIHandle handle = ui_text(content, 11, false);
    ui_text_set_color_system(handle, 1);
    return handle;
}

UIHandle ui_symbol(const char *name, int size) {
    NSString *symbolName = [NSString stringWithUTF8String:name ?: ""];
    UIImage *symbol = [UIImage systemImageNamed:symbolName];
    UIImageView *imageView = [[UIImageView alloc] initWithImage:symbol];
    imageView.tintColor = [UIColor secondaryLabelColor];
    imageView.contentMode = UIViewContentModeScaleAspectFit;
    TSNShadowNode *node = tsn_create_view_node(imageView, TSNNodeKindLeaf, 0, YES);
    if (size > 0) {
        YGNodeStyleSetWidth(node.yogaNode, size);
        YGNodeStyleSetHeight(node.yogaNode, size);
    }
    retain_render(imageView);
    return (__bridge UIHandle)imageView;
}

void ui_symbol_set_color(UIHandle s, int systemColor) {
    UIView *view = tsn_view_for_handle(s);
    if ([view isKindOfClass:[UIImageView class]]) {
        ((UIImageView *)view).tintColor = system_color(systemColor);
    }
}

UIHandle ui_image(const char *pathValue) {
    NSString *source = [NSString stringWithUTF8String:pathValue ?: ""];
    UIImageView *imageView = [UIImageView new];
    imageView.image = tsn_load_image(source);
    imageView.contentMode = UIViewContentModeScaleAspectFit;
    imageView.clipsToBounds = YES;
    tsn_create_view_node(imageView, TSNNodeKindLeaf, 0, YES);
    retain_render(imageView);
    return (__bridge UIHandle)imageView;
}

void ui_image_set_scaling(UIHandle img, int mode) {
    UIView *view = tsn_view_for_handle(img);
    if (![view isKindOfClass:[UIImageView class]]) return;
    UIImageView *imageView = (UIImageView *)view;
    switch (mode) {
        case 1:
            imageView.contentMode = UIViewContentModeScaleAspectFill;
            imageView.clipsToBounds = YES;
            break;
        case 2:
            imageView.contentMode = UIViewContentModeScaleToFill;
            break;
        default:
            imageView.contentMode = UIViewContentModeScaleAspectFit;
            break;
    }
}

UIHandle ui_text_field(const char *placeholder) {
    UITextField *field = [UITextField new];
    field.placeholder = [NSString stringWithUTF8String:placeholder ?: ""];
    field.borderStyle = UITextBorderStyleRoundedRect;
    field.textColor = [UIColor labelColor];
    field.backgroundColor = [UIColor secondarySystemBackgroundColor];
    TSNShadowNode *node = tsn_create_view_node(field, TSNNodeKindLeaf, 0, YES);
    YGNodeStyleSetHeight(node.yogaNode, 36);
    retain_render(field);
    return (__bridge UIHandle)field;
}

UIHandle ui_search_field(const char *placeholder) {
    UISearchBar *search = [UISearchBar new];
    search.placeholder = [NSString stringWithUTF8String:placeholder ?: ""];
    search.searchBarStyle = UISearchBarStyleMinimal;
    TSNShadowNode *node = tsn_create_view_node(search, TSNNodeKindLeaf, 0, YES);
    YGNodeStyleSetHeight(node.yogaNode, 44);
    retain_render(search);
    return (__bridge UIHandle)search;
}

UIHandle ui_text_area(const char *placeholder) { (void)placeholder; return ui_view(); }
UIHandle ui_select(void) { return ui_view(); }
void ui_select_add_option(UIHandle select, const char *label) { (void)select; (void)label; }
void ui_select_set_value(UIHandle select, const char *value) { (void)select; (void)value; }
void ui_on_text_changed(UIHandle field, UITextChangedFn fn) { (void)field; (void)fn; }
void ui_on_select_changed(UIHandle select, UITextChangedFn fn) { (void)select; (void)fn; }
void ui_text_input_set_value(UIHandle field, const char *text) {
    UIView *view = tsn_view_for_handle(field);
    NSString *value = [NSString stringWithUTF8String:text ?: ""];
    if ([view isKindOfClass:[UITextField class]]) ((UITextField *)view).text = value;
    if ([view isKindOfClass:[UISearchBar class]]) ((UISearchBar *)view).text = value;
}

UIHandle ui_checkbox(const char *label, bool initial) { (void)label; return ui_switch(initial); }
UIHandle ui_radio(const char *label, bool initial) { (void)label; return ui_switch(initial); }

UIHandle ui_switch(bool initial) {
    UISwitch *toggle = [UISwitch new];
    toggle.on = initial;
    tsn_create_view_node(toggle, TSNNodeKindLeaf, 0, YES);
    retain_render(toggle);
    return (__bridge UIHandle)toggle;
}

void ui_on_bool_changed(UIHandle control, UIBoolChangedFn fn) { (void)control; (void)fn; }

void ui_bool_control_set_value(UIHandle control, bool on) {
    UIView *view = tsn_view_for_handle(control);
    if ([view isKindOfClass:[UISwitch class]]) {
        ((UISwitch *)view).on = on;
    }
}

UIHandle ui_button(const char *label, UIClickFn fn, int tag) {
    UIButton *button = [UIButton buttonWithType:UIButtonTypeCustom];
    [button setTitle:[NSString stringWithUTF8String:label ?: ""] forState:UIControlStateNormal];
    button.backgroundColor = [UIColor clearColor];
    button.titleLabel.lineBreakMode = NSLineBreakByTruncatingTail;
    button.titleLabel.adjustsFontSizeToFitWidth = NO;
    tsn_create_view_node(button, TSNNodeKindLeaf, 0, YES);
    ui_button_set_style((__bridge UIHandle)button, 0);
    if (fn) {
        TSNClickTarget *target = [TSNClickTarget new];
        target.fn = fn;
        target.tag = tag;
        [button addTarget:target action:@selector(invokeControl:) forControlEvents:UIControlEventTouchUpInside];
        objc_setAssociatedObject(button, &kButtonClickTargetKey, target, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
        retain_persistent(target);
    }
    retain_render(button);
    return (__bridge UIHandle)button;
}

UIHandle ui_button_icon(const char *sf_symbol, const char *label, UIClickFn fn, int tag) {
    UIButton *button = (__bridge UIButton *)ui_button(label, fn, tag);
    NSString *symbolName = [NSString stringWithUTF8String:sf_symbol ?: ""];
    UIImage *image = [UIImage systemImageNamed:symbolName];
    [button setImage:image forState:UIControlStateNormal];
    button.tintColor = [button titleColorForState:UIControlStateNormal];
    button.imageView.contentMode = UIViewContentModeScaleAspectFit;
    return (__bridge UIHandle)button;
}

void ui_button_set_style(UIHandle b, int style) {
    UIView *view = tsn_view_for_handle(b);
    if (![view isKindOfClass:[UIButton class]]) return;
    tsn_apply_button_style((UIButton *)view, style);
}

void ui_on_click(UIHandle v, UIClickFn fn, int tag) {
    if (!fn) return;
    UIView *view = tsn_view_for_handle(v);
    if (!view) return;
    view.userInteractionEnabled = YES;

    if ([view isKindOfClass:[UIControl class]]) {
        TSNClickTarget *target = [TSNClickTarget new];
        target.fn = fn;
        target.tag = tag;
        [(UIControl *)view addTarget:target action:@selector(invokeControl:) forControlEvents:UIControlEventTouchUpInside];
        objc_setAssociatedObject(view, &kButtonClickTargetKey, target, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
        retain_persistent(target);
        return;
    }

    if ([view isKindOfClass:[TSNContainerView class]]) {
        TSNClickTarget *target = [TSNClickTarget new];
        target.fn = fn;
        target.tag = tag;
        ((TSNContainerView *)view).tsnClickTarget = target;
        retain_persistent(target);
        return;
    }

    TSNClickTarget *target = [TSNClickTarget new];
    target.fn = fn;
    target.tag = tag;
    UITapGestureRecognizer *gesture = [[UITapGestureRecognizer alloc] initWithTarget:target action:@selector(invokeTap:)];
    [view addGestureRecognizer:gesture];
    objc_setAssociatedObject(view, &kGestureClickTargetKey, target, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    retain_persistent(target);
    retain_persistent(gesture);
}

UIHandle ui_segmented(int count, const char **labels) {
    UISegmentedControl *segmented = [UISegmentedControl new];
    for (int i = 0; i < count; i++) {
        NSString *label = [NSString stringWithUTF8String:labels[i] ?: ""];
        [segmented insertSegmentWithTitle:label atIndex:i animated:NO];
    }
    tsn_create_view_node(segmented, TSNNodeKindLeaf, 0, YES);
    retain_render(segmented);
    return (__bridge UIHandle)segmented;
}

void ui_segmented_on_change(UIHandle seg, UISegmentFn fn) { (void)seg; (void)fn; }

UIHandle ui_toggle(const char *label, bool initial) { (void)label; return ui_switch(initial); }
void ui_toggle_on_change(UIHandle tog, UIToggleFn fn) { (void)tog; (void)fn; }

UIHandle ui_progress(double value) {
    UIProgressView *progress = [[UIProgressView alloc] initWithProgressViewStyle:UIProgressViewStyleDefault];
    progress.progress = value < 0 ? 0 : MIN(MAX(value / 100.0, 0), 1);
    progress.trackTintColor = [UIColor colorWithWhite:1 alpha:0.08];
    progress.progressTintColor = [UIColor whiteColor];
    TSNShadowNode *node = tsn_create_view_node(progress, TSNNodeKindLeaf, 0, YES);
    YGNodeStyleSetHeight(node.yogaNode, 4);
    retain_render(progress);
    return (__bridge UIHandle)progress;
}

void ui_progress_set(UIHandle p, double value) {
    UIView *view = tsn_view_for_handle(p);
    if ([view isKindOfClass:[UIProgressView class]]) {
        ((UIProgressView *)view).progress = value < 0 ? 0 : MIN(MAX(value / 100.0, 0), 1);
    }
}

UIHandle ui_badge(const char *text, int systemColor) {
    UIHandle handle = ui_text(text, 10, true);
    UIView *view = tsn_view_for_handle(handle);
    view.backgroundColor = system_color(systemColor);
    view.layer.cornerRadius = 8;
    view.layer.masksToBounds = YES;
    return handle;
}

UIHandle ui_card(void) {
    TSNContainerView *view = [TSNContainerView new];
    view.backgroundColor = [UIColor colorWithWhite:0.12 alpha:1];
    view.layer.cornerRadius = 12;
    view.layer.masksToBounds = YES;
    objc_setAssociatedObject(view, &kCardContainerKey, @YES, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    tsn_create_container_node(view, TSNNodeKindVStack, 0);
    retain_render(view);
    return (__bridge UIHandle)view;
}

void ui_card_set_color(UIHandle c, double r, double g, double b, double a) {
    UIView *view = tsn_view_for_handle(c);
    if (view) view.backgroundColor = tsn_rgb_color(r, g, b, a);
}

UIHandle ui_stat(const char *value, const char *label, int systemColor) {
    UIHandle card = ui_card();
    UIHandle stack = ui_vstack();
    ui_set_spacing(stack, 4);
    UIHandle valueText = ui_text(value, 24, true);
    ui_text_set_color_system(valueText, systemColor);
    UIHandle labelText = ui_text(label, 12, false);
    ui_text_set_color_system(labelText, 1);
    ui_add_child(stack, valueText);
    ui_add_child(stack, labelText);
    ui_add_child(card, stack);
    return card;
}

UIHandle ui_sidebar(int width) {
    UIHandle view = ui_vstack();
    ui_set_size(view, width, -1);
    return view;
}

UIHandle ui_sidebar_section(UIHandle sidebar, const char *header) {
    UIHandle label = ui_text(header, 10, true);
    ui_text_set_color_system(label, 1);
    ui_add_child(sidebar, label);
    return sidebar;
}

UIHandle ui_sidebar_item(UIHandle section, const char *label, const char *sf_symbol, int tag, UIClickFn fn) {
    UIHandle item = (sf_symbol && strlen(sf_symbol) > 0)
        ? ui_button_icon(sf_symbol, label, fn, tag)
        : ui_button(label, fn, tag);
    ui_add_child(section, item);
    return item;
}

void ui_sidebar_item_set_badge(UIHandle item, const char *badge_text) { (void)item; (void)badge_text; }

UIHandle ui_data_table(void) { return ui_view(); }
void ui_data_table_add_column(UIHandle tbl, const char *id, const char *title, int width) { (void)tbl; (void)id; (void)title; (void)width; }
void ui_data_table_set_data(UIHandle tbl, int rows, UITableCellFn fn, void *ctx) { (void)tbl; (void)rows; (void)fn; (void)ctx; }
void ui_data_table_set_row_height(UIHandle tbl, int height) { (void)tbl; (void)height; }
void ui_data_table_set_alternating(UIHandle tbl, bool alt) { (void)tbl; (void)alt; }

UIHandle ui_bar_chart(int height) { UIHandle view = ui_view(); ui_set_size(view, -1, height); return view; }
void ui_bar_chart_add(UIHandle chart, const char *label, double value, int system_color_index) { (void)chart; (void)label; (void)value; (void)system_color_index; }
void ui_bar_chart_set_title(UIHandle chart, const char *title) { (void)chart; (void)title; }

UIHandle ui_sparkline(int width, int height) { UIHandle view = ui_view(); ui_set_size(view, width, height); return view; }
void ui_sparkline_set_values(UIHandle spark, double *values, int count, int system_color_index) { (void)spark; (void)values; (void)count; (void)system_color_index; }

UIHandle ui_scroll(void) {
    UIScrollView *scrollView = [UIScrollView new];
    scrollView.backgroundColor = [UIColor clearColor];
    scrollView.showsVerticalScrollIndicator = YES;
    scrollView.showsHorizontalScrollIndicator = NO;
    scrollView.alwaysBounceVertical = YES;
    tsn_create_scroll_node(scrollView);
    retain_render(scrollView);
    return (__bridge UIHandle)scrollView;
}

void ui_scroll_set_axis(UIHandle s, int axis) {
    UIView *view = tsn_view_for_handle(s);
    if (![view isKindOfClass:[UIScrollView class]]) return;
    TSNShadowNode *node = tsn_shadow_node_for_obj(view);
    TSNPendingLayoutStyle *style = tsn_current_layout_style(view, YES);
    style->hasScrollAxis = YES;
    style->scrollAxis = axis;
    if (!tsn_is_recording_responsive_variant(view) && node) tsn_apply_layout_style(node, style);
}

UIHandle ui_tab_view(void) { return ui_vstack(); }
UIHandle ui_tab(UIHandle tv, const char *label, const char *sf_symbol) { (void)label; (void)sf_symbol; return tv; }
void ui_show_popover(UIHandle anchor, UIHandle content, int width, int height) { (void)anchor; (void)content; (void)width; (void)height; }

void ui_alert(const char *title, const char *message, const char *button) {
    NSString *titleText = [NSString stringWithUTF8String:title ?: ""];
    NSString *messageText = [NSString stringWithUTF8String:message ?: ""];
    NSString *buttonText = [NSString stringWithUTF8String:button ?: "OK"];
    UIAlertController *alert = [UIAlertController alertControllerWithTitle:titleText message:messageText preferredStyle:UIAlertControllerStyleAlert];
    [alert addAction:[UIAlertAction actionWithTitle:buttonText style:UIAlertActionStyleDefault handler:nil]];
    UIViewController *controller = g_live_window.rootViewController;
    if (controller) [controller presentViewController:alert animated:YES completion:nil];
}

void ui_set_shadow(UIHandle v, double ox, double oy, double radius, double opacity) {
    UIView *view = tsn_view_for_handle(v);
    if (!view) return;
    view.layer.shadowColor = [UIColor blackColor].CGColor;
    view.layer.shadowOffset = CGSizeMake(ox, oy);
    view.layer.shadowRadius = radius;
    view.layer.shadowOpacity = opacity;
}

void ui_set_background_rgb(UIHandle v, double r, double g, double b, double a) {
    UIView *view = tsn_view_for_handle(v);
    if (view) view.backgroundColor = tsn_rgb_color(r, g, b, a);
}

void ui_set_background_system(UIHandle v, int color) {
    UIView *view = tsn_view_for_handle(v);
    if (view) view.backgroundColor = system_color(color);
}

void ui_set_corner_radius(UIHandle v, double r) {
    UIView *view = tsn_view_for_handle(v);
    if (!view) return;
    view.layer.cornerRadius = r;
    if (r > 0) view.layer.masksToBounds = YES;
    tsn_sync_view_layers(view);
}

void ui_set_border_color(UIHandle v, double r, double g, double b, double a) {
    UIView *view = tsn_view_for_handle(v);
    if (!view) return;
    view.layer.borderColor = tsn_rgb_color(r, g, b, a).CGColor;
}

void ui_set_border_width(UIHandle v, double width) {
    UIView *view = tsn_view_for_handle(v);
    if (!view) return;
    view.layer.borderWidth = width;
}

void ui_animate(UIHandle v, double duration) { (void)v; (void)duration; }

typedef void (*UITimerThunk)(void);

@interface TSNTimerTarget : NSObject
@property (nonatomic, assign) UITimerThunk fn;
- (void)fire:(NSTimer *)timer;
@end

@implementation TSNTimerTarget
- (void)fire:(__unused NSTimer *)timer {
    if (self.fn) self.fn();
}
@end

void ui_set_timer(double interval_sec, UITimerFn fn) {
    if (!fn) return;
    TSNTimerTarget *target = [TSNTimerTarget new];
    target.fn = fn;
    NSTimer *timer = [NSTimer scheduledTimerWithTimeInterval:interval_sec
                                                      target:target
                                                    selector:@selector(fire:)
                                                    userInfo:nil
                                                     repeats:YES];
    retain_persistent(target);
    retain_persistent(timer);
}

static int inspector_port(void) {
    const char *raw = getenv("TSN_INSPECTOR_PORT");
    if (!raw || raw[0] == 0) return 0;
    return atoi(raw);
}

static TSNShadowNode *inspector_root_node(void) {
    if (g_current_window_model.rootNode) return g_current_window_model.rootNode;
    if (g_pending_window_model.rootNode) return g_pending_window_model.rootNode;
    return nil;
}

static NSArray<UIView *> *inspector_child_views(UIView *view) {
    TSNShadowNode *node = tsn_shadow_node_for_obj(view);
    if (node && node.children.count > 0) {
        NSMutableArray<UIView *> *views = [NSMutableArray new];
        for (TSNShadowNode *child in node.children) {
            if (child.view) [views addObject:child.view];
        }
        return views;
    }
    return view.subviews ?: @[];
}

static NSString *inspector_node_text(UIView *view) {
    if ([view isKindOfClass:[TSNTextLabel class]]) return ((TSNTextLabel *)view).tsnRawText ?: @"";
    if ([view isKindOfClass:[UIButton class]]) return [((UIButton *)view) titleForState:UIControlStateNormal] ?: @"";
    if ([view isKindOfClass:[UITextField class]]) return ((UITextField *)view).text ?: @"";
    if ([view isKindOfClass:[UISearchBar class]]) return ((UISearchBar *)view).text ?: @"";
    if ([view isKindOfClass:[UISwitch class]]) return ((UISwitch *)view).on ? @"true" : @"false";
    return @"";
}

static NSString *inspector_element_id_for_view(UIView *view) {
    for (NSString *key in g_element_ids) {
        if (g_element_ids[key] == view) return key;
    }
    return @"";
}

static BOOL view_subtree_contains_label(UIView *view, NSString *label) {
    NSString *text = inspector_node_text(view);
    if ([text containsString:label]) return YES;
    for (UIView *child in inspector_child_views(view)) {
        if (view_subtree_contains_label(child, label)) return YES;
    }
    return NO;
}

static void dump_tree_node(TSNShadowNode *node, int depth, NSMutableString *out) {
    if (!node || !node.view) return;
    NSString *indent = [@"" stringByPaddingToLength:depth * 2 withString:@" " startingAtIndex:0];
    UIView *view = node.view;
    CGRect f = view.frame;
    NSString *type = tsn_kind_name(node);
    NSString *text = inspector_node_text(view);
    NSString *extra = @"";

    if (node.yogaNode) {
        float fg = YGNodeStyleGetFlexGrow(node.yogaNode);
        if (fg > 0) extra = [extra stringByAppendingFormat:@" flex=%.0f", fg];
        YGValue yw = YGNodeStyleGetWidth(node.yogaNode);
        if (yw.unit == YGUnitPoint) extra = [extra stringByAppendingFormat:@" fw=%.0f", yw.value];
        YGValue yh = YGNodeStyleGetHeight(node.yogaNode);
        if (yh.unit == YGUnitPoint) extra = [extra stringByAppendingFormat:@" fh=%.0f", yh.value];
    }

    if (text.length > 0) {
        NSString *trimmed = text.length > 40 ? [[text substringToIndex:40] stringByAppendingString:@"…"] : text;
        [out appendFormat:@"%@%@ \"%@\" (%.0f×%.0f at %.0f,%.0f)%@\n",
            indent, type, trimmed, f.size.width, f.size.height, f.origin.x, f.origin.y, extra];
    } else {
        [out appendFormat:@"%@%@ (%.0f×%.0f at %.0f,%.0f)%@\n",
            indent, type, f.size.width, f.size.height, f.origin.x, f.origin.y, extra];
    }

    for (TSNShadowNode *child in node.children) dump_tree_node(child, depth + 1, out);
}

static NSString *take_screenshot(void) {
    if (!g_live_window) return @"No window\n";
    NSString *path = @"/tmp/tsn-screenshot.png";

    dispatch_sync(dispatch_get_main_queue(), ^{
        [g_live_window layoutIfNeeded];
        UIGraphicsImageRenderer *renderer = [[UIGraphicsImageRenderer alloc] initWithBounds:g_live_window.bounds];
        UIImage *image = [renderer imageWithActions:^(UIGraphicsImageRendererContext * _Nonnull context) {
            [g_live_window.layer renderInContext:context.CGContext];
        }];
        NSData *png = UIImagePNGRepresentation(image);
        [png writeToFile:path atomically:YES];
    });

    return [NSString stringWithFormat:@"Screenshot saved: %@\n", path];
}

static NSString *click_button(NSString *label, UIView *view) {
    NSString *text = inspector_node_text(view);
    BOOL directMatch = [text containsString:label];
    BOOL subtreeMatch = directMatch || view_subtree_contains_label(view, label);
    if (subtreeMatch) {
        if ([view isKindOfClass:[UIButton class]]) {
            [(UIButton *)view sendActionsForControlEvents:UIControlEventTouchUpInside];
            return [NSString stringWithFormat:@"Clicked: %@\n", directMatch ? text : label];
        }
        if ([view isKindOfClass:[UIControl class]]) {
            [(UIControl *)view sendActionsForControlEvents:UIControlEventTouchUpInside];
            return [NSString stringWithFormat:@"Clicked: %@\n", directMatch ? text : label];
        }
        if ([view isKindOfClass:[TSNContainerView class]] && ((TSNContainerView *)view).tsnClickTarget != nil) {
            [((NSObject *)((TSNContainerView *)view).tsnClickTarget) performSelector:@selector(invokeControl:) withObject:view];
            return [NSString stringWithFormat:@"Clicked: %@\n", directMatch ? text : label];
        }
        id gestureTarget = objc_getAssociatedObject(view, &kGestureClickTargetKey);
        if (gestureTarget != nil) {
            [(NSObject *)gestureTarget performSelector:@selector(invokeTap:) withObject:nil];
            return [NSString stringWithFormat:@"Clicked: %@\n", directMatch ? text : label];
        }
    }

    for (UIView *child in inspector_child_views(view)) {
        NSString *result = click_button(label, child);
        if (result) return result;
    }
    return nil;
}

static NSString *click_element(NSString *element_id) {
    UIView *view = g_element_ids[element_id];
    if (!view) return [NSString stringWithFormat:@"Element not found: %@\n", element_id];

    if ([view isKindOfClass:[UIButton class]]) {
        [(UIButton *)view sendActionsForControlEvents:UIControlEventTouchUpInside];
        NSString *text = inspector_node_text(view);
        return [NSString stringWithFormat:@"Clicked: %@\n", text.length > 0 ? text : element_id];
    }
    if ([view isKindOfClass:[UIControl class]]) {
        [(UIControl *)view sendActionsForControlEvents:UIControlEventTouchUpInside];
        NSString *text = inspector_node_text(view);
        return [NSString stringWithFormat:@"Clicked: %@\n", text.length > 0 ? text : element_id];
    }
    if ([view isKindOfClass:[TSNContainerView class]] && ((TSNContainerView *)view).tsnClickTarget != nil) {
        [((NSObject *)((TSNContainerView *)view).tsnClickTarget) performSelector:@selector(invokeControl:) withObject:view];
        NSString *text = inspector_node_text(view);
        return [NSString stringWithFormat:@"Clicked: %@\n", text.length > 0 ? text : element_id];
    }
    id gestureTarget = objc_getAssociatedObject(view, &kGestureClickTargetKey);
    if (gestureTarget != nil) {
        [(NSObject *)gestureTarget performSelector:@selector(invokeTap:) withObject:nil];
        NSString *text = inspector_node_text(view);
        return [NSString stringWithFormat:@"Clicked: %@\n", text.length > 0 ? text : element_id];
    }

    return [NSString stringWithFormat:@"Element not clickable: %@\n", element_id];
}

static NSString *type_text(NSString *text, UIView *view) {
    if ([view isKindOfClass:[UISearchBar class]]) {
        UISearchBar *field = (UISearchBar *)view;
        field.text = text;
        if (field.delegate && [field.delegate respondsToSelector:@selector(searchBar:textDidChange:)]) {
            [field.delegate searchBar:field textDidChange:text];
        }
        return [NSString stringWithFormat:@"Typed: %@\n", text];
    }
    if ([view isKindOfClass:[UITextField class]]) {
        UITextField *field = (UITextField *)view;
        field.text = text;
        [field sendActionsForControlEvents:UIControlEventEditingChanged];
        return [NSString stringWithFormat:@"Typed: %@\n", text];
    }

    for (UIView *child in inspector_child_views(view)) {
        NSString *result = type_text(text, child);
        if (result) return result;
    }
    return nil;
}

static NSString *type_text_into(NSString *element_id, NSString *text) {
    UIView *view = g_element_ids[element_id];
    if (!view) return [NSString stringWithFormat:@"Element not found: %@\n", element_id];

    if ([view isKindOfClass:[UISearchBar class]]) {
        UISearchBar *field = (UISearchBar *)view;
        field.text = text;
        if (field.delegate && [field.delegate respondsToSelector:@selector(searchBar:textDidChange:)]) {
            [field.delegate searchBar:field textDidChange:text];
        }
        return [NSString stringWithFormat:@"Typed into %@: %@\n", element_id, text];
    }
    if ([view isKindOfClass:[UITextField class]]) {
        UITextField *field = (UITextField *)view;
        field.text = text;
        [field sendActionsForControlEvents:UIControlEventEditingChanged];
        return [NSString stringWithFormat:@"Typed into %@: %@\n", element_id, text];
    }

    return [NSString stringWithFormat:@"Element is not text input: %@\n", element_id];
}

static void find_text(UIView *view, NSString *query, int depth, NSMutableString *out) {
    NSString *text = inspector_node_text(view);
    if ([text localizedCaseInsensitiveContainsString:query]) {
        NSString *indent = [@"" stringByPaddingToLength:depth * 2 withString:@" " startingAtIndex:0];
        CGRect f = view.frame;
        NSString *type = tsn_kind_name(tsn_shadow_node_for_obj(view));
        [out appendFormat:@"%@%@ \"%@\" (%.0f×%.0f at %.0f,%.0f)\n",
            indent, type, text, f.size.width, f.size.height, f.origin.x, f.origin.y];
    }

    for (UIView *child in inspector_child_views(view)) {
        find_text(child, query, depth + 1, out);
    }
}

static NSString *get_property(NSString *element_id, NSString *prop) {
    UIView *view = g_element_ids[element_id];
    if (!view) return [NSString stringWithFormat:@"Element not found: %@\n", element_id];

    [g_live_window layoutIfNeeded];
    [view layoutIfNeeded];
    TSNShadowNode *node = tsn_shadow_node_for_obj(view);

    if ([prop isEqualToString:@"frame"]) {
        CGRect f = view.frame;
        return [NSString stringWithFormat:@"%.0f×%.0f at %.0f,%.0f\n",
            f.size.width, f.size.height, f.origin.x, f.origin.y];
    }
    if ([prop isEqualToString:@"wframe"]) {
        CGRect rect = [view convertRect:view.bounds toView:g_live_window.rootViewController.view];
        return [NSString stringWithFormat:@"%.0f×%.0f at %.0f,%.0f\n",
            rect.size.width, rect.size.height, rect.origin.x, rect.origin.y];
    }
    if ([prop isEqualToString:@"text"]) {
        NSString *text = inspector_node_text(view);
        return text.length > 0 ? [NSString stringWithFormat:@"%@\n", text] : @"(no text)\n";
    }
    if ([prop isEqualToString:@"value"]) {
        if ([view isKindOfClass:[TSNTextLabel class]]) return [NSString stringWithFormat:@"%@\n", ((TSNTextLabel *)view).tsnRawText ?: @""];
        if ([view isKindOfClass:[UITextField class]]) return [NSString stringWithFormat:@"%@\n", ((UITextField *)view).text ?: @""];
        if ([view isKindOfClass:[UISearchBar class]]) return [NSString stringWithFormat:@"%@\n", ((UISearchBar *)view).text ?: @""];
        if ([view isKindOfClass:[UISwitch class]]) return ((UISwitch *)view).on ? @"true\n" : @"false\n";
        if ([view isKindOfClass:[UIButton class]]) return [NSString stringWithFormat:@"%@\n", [((UIButton *)view) titleForState:UIControlStateNormal] ?: @""];
        if ([view isKindOfClass:[UIProgressView class]]) return [NSString stringWithFormat:@"%.2f\n", ((UIProgressView *)view).progress * 100.0];
        return @"(no value)\n";
    }
    if ([prop isEqualToString:@"placeholder"]) {
        if ([view isKindOfClass:[UITextField class]]) return [NSString stringWithFormat:@"%@\n", ((UITextField *)view).placeholder ?: @""];
        if ([view isKindOfClass:[UISearchBar class]]) return [NSString stringWithFormat:@"%@\n", ((UISearchBar *)view).placeholder ?: @""];
        return @"(no placeholder)\n";
    }
    if ([prop isEqualToString:@"indeterminate"]) return @"false\n";
    if ([prop isEqualToString:@"hidden"]) return view.isHidden ? @"true\n" : @"false\n";
    if ([prop isEqualToString:@"children"]) {
        if (node) return [NSString stringWithFormat:@"%d children\n", (int)node.children.count];
        return [NSString stringWithFormat:@"%d subviews\n", (int)view.subviews.count];
    }
    if ([prop isEqualToString:@"rows"]) return @"0\n";
    if ([prop isEqualToString:@"columns"]) return @"0\n";
    if ([prop isEqualToString:@"flex"]) {
        if (node && node.yogaNode) return [NSString stringWithFormat:@"%.0f\n", YGNodeStyleGetFlexGrow(node.yogaNode)];
        return @"0\n";
    }
    if ([prop isEqualToString:@"type"]) {
        if (node) return [NSString stringWithFormat:@"%@\n", tsn_kind_name(node)];
        return [NSString stringWithFormat:@"%@\n", NSStringFromClass([view class])];
    }

    CGRect f = view.frame;
    NSString *type = node ? tsn_kind_name(node) : NSStringFromClass([view class]);
    return [NSString stringWithFormat:@"%@ (%.0f×%.0f at %.0f,%.0f)\n",
        type, f.size.width, f.size.height, f.origin.x, f.origin.y];
}

static UIScrollView *find_main_scroll_view(UIView *root) {
    UIScrollView *best = nil;
    CGFloat bestArea = 0;
    NSMutableArray<UIView *> *queue = [NSMutableArray arrayWithObject:root];
    while (queue.count > 0) {
        UIView *view = queue[0];
        [queue removeObjectAtIndex:0];
        if ([view isKindOfClass:[UIScrollView class]]) {
            UIScrollView *scrollView = (UIScrollView *)view;
            CGFloat area = scrollView.frame.size.width * scrollView.frame.size.height;
            if (area > bestArea) {
                best = scrollView;
                bestArea = area;
            }
        }
        for (UIView *child in inspector_child_views(view)) [queue addObject:child];
    }
    return best;
}

static NSString *handle_command(NSString *cmd) {
    cmd = [cmd stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];

    if ([cmd isEqualToString:@"tree"]) {
        if (!g_live_window) return @"No window\n";
        __block NSMutableString *out = [NSMutableString new];
        dispatch_sync(dispatch_get_main_queue(), ^{
            CGRect wf = g_live_window.bounds;
            NSString *title = g_current_window_model.title ?: @"App";
            [out appendFormat:@"Window \"%@\" (%.0f×%.0f)\n", title, wf.size.width, wf.size.height];
            TSNShadowNode *root = inspector_root_node();
            if (root) {
                for (TSNShadowNode *child in root.children) dump_tree_node(child, 1, out);
            } else {
                for (UIView *subview in g_live_window.rootViewController.view.subviews) {
                    TSNShadowNode *childNode = tsn_shadow_node_for_obj(subview);
                    if (childNode) dump_tree_node(childNode, 1, out);
                }
            }
        });
        return out;
    }

    if ([cmd isEqualToString:@"screenshot"]) return take_screenshot();

    if ([cmd hasPrefix:@"click "]) {
        NSString *label = [cmd substringFromIndex:6];
        if (!g_live_window) return @"No window\n";
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            result = click_button(label, g_live_window.rootViewController.view);
        });
        return result ?: [NSString stringWithFormat:@"Button not found: %@\n", label];
    }

    if ([cmd hasPrefix:@"clickid "]) {
        NSString *element_id = [cmd substringFromIndex:8];
        if (!g_live_window) return @"No window\n";
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            result = click_element(element_id);
        });
        return result ?: [NSString stringWithFormat:@"Element not found: %@\n", element_id];
    }

    if ([cmd hasPrefix:@"type "]) {
        NSString *text = [cmd substringFromIndex:5];
        if (!g_live_window) return @"No window\n";
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            result = type_text(text, g_live_window.rootViewController.view);
        });
        return result ?: @"No search field found\n";
    }

    if ([cmd hasPrefix:@"typeid "]) {
        NSString *args = [cmd substringFromIndex:7];
        NSRange firstSpace = [args rangeOfString:@" "];
        if (firstSpace.location == NSNotFound) return @"Usage: typeid <id> <text>\n";
        NSString *element_id = [args substringToIndex:firstSpace.location];
        NSString *text = [args substringFromIndex:firstSpace.location + 1];
        if (!g_live_window) return @"No window\n";
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            result = type_text_into(element_id, text);
        });
        return result ?: [NSString stringWithFormat:@"Input not found: %@\n", element_id];
    }

    if ([cmd hasPrefix:@"find "]) {
        NSString *query = [[cmd substringFromIndex:5] stringByTrimmingCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"\"'"]];
        if (!g_live_window) return @"No window\n";
        __block NSMutableString *out = [NSMutableString new];
        dispatch_sync(dispatch_get_main_queue(), ^{
            find_text(g_live_window.rootViewController.view, query, 0, out);
        });
        return out.length > 0 ? out : [NSString stringWithFormat:@"No matches for: %@\n", query];
    }

    if ([cmd hasPrefix:@"get "]) {
        NSString *args = [cmd substringFromIndex:4];
        NSArray<NSString *> *parts = [args componentsSeparatedByString:@" "];
        NSString *element_id = parts[0];
        NSString *prop = parts.count > 1 ? parts[1] : @"frame";
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            result = get_property(element_id, prop);
        });
        return result;
    }

    if ([cmd hasPrefix:@"probe "]) {
        NSString *element_id = [cmd substringFromIndex:6];
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            UIView *view = g_element_ids[element_id];
            if (!view) {
                result = [NSString stringWithFormat:@"Element not found: %@\n", element_id];
                return;
            }

            TSNShadowNode *node = tsn_shadow_node_for_obj(view);
            CGRect f = view.frame;
            NSMutableString *out = [NSMutableString new];
            [out appendFormat:@"probe %@\n", element_id];
            [out appendFormat:@"  self: %.0f×%.0f at %.0f,%.0f\n", f.size.width, f.size.height, f.origin.x, f.origin.y];

            UIView *parent = view.superview;
            if (parent) {
                CGRect pf = parent.frame;
                [out appendFormat:@"  parent: %.0f×%.0f at %.0f,%.0f", pf.size.width, pf.size.height, pf.origin.x, pf.origin.y];
                TSNShadowNode *parentNode = tsn_shadow_node_for_obj(parent);
                if (parentNode) [out appendFormat:@" (%@)", tsn_kind_name(parentNode)];
                [out appendString:@"\n"];
                CGFloat gapLeft = f.origin.x;
                CGFloat gapTop = f.origin.y;
                CGFloat gapRight = pf.size.width - (f.origin.x + f.size.width);
                CGFloat gapBottom = pf.size.height - (f.origin.y + f.size.height);
                [out appendFormat:@"  edges: left=%.0f top=%.0f right=%.0f bottom=%.0f\n", gapLeft, gapTop, gapRight, gapBottom];
            } else {
                [out appendString:@"  parent: (none)\n"];
            }

            if (node && node.yogaNode) {
                YGNodeRef yn = node.yogaNode;
                [out appendFormat:@"  padding: top=%.0f right=%.0f bottom=%.0f left=%.0f\n",
                    YGNodeStyleGetPadding(yn, YGEdgeTop).value,
                    YGNodeStyleGetPadding(yn, YGEdgeRight).value,
                    YGNodeStyleGetPadding(yn, YGEdgeBottom).value,
                    YGNodeStyleGetPadding(yn, YGEdgeLeft).value];
                YGValue gap = YGNodeStyleGetGap(yn, YGGutterAll);
                [out appendFormat:@"  spacing: %.0f  align_items: %d  justify: %d\n",
                    gap.value, (int)YGNodeStyleGetAlignItems(yn), (int)YGNodeStyleGetJustifyContent(yn)];
                [out appendFormat:@"  children: %lu\n", (unsigned long)node.children.count];

                for (NSUInteger i = 0; i < node.children.count; i++) {
                    TSNShadowNode *childNode = node.children[i];
                    UIView *child = childNode.view;
                    CGRect cf = child.frame;
                    NSString *childId = inspector_element_id_for_view(child);
                    [out appendFormat:@"    [%lu] %@ %@  %.0f×%.0f at %.0f,%.0f\n",
                        (unsigned long)i, tsn_kind_name(childNode), childId,
                        cf.size.width, cf.size.height, cf.origin.x, cf.origin.y];
                }
            }
            result = out;
        });
        return result;
    }

    if ([cmd hasPrefix:@"scroll "]) {
        NSString *args = [cmd substringFromIndex:7];
        NSArray<NSString *> *parts = [args componentsSeparatedByString:@" "];
        NSInteger ticks = [parts[0] integerValue];
        BOOL isNumber = ticks != 0 || [parts[0] isEqualToString:@"0"];
        NSString *element_id = isNumber ? nil : parts[0];
        if (!isNumber && parts.count > 1) ticks = [parts[1] integerValue];
        if (isNumber && ticks == 0) ticks = 1;
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            UIScrollView *scrollView = nil;
            if (element_id) {
                UIView *view = g_element_ids[element_id];
                if (!view) {
                    result = [NSString stringWithFormat:@"Element not found: %@\n", element_id];
                    return;
                }
                UIView *walk = view;
                while (walk) {
                    if ([walk isKindOfClass:[UIScrollView class]]) {
                        scrollView = (UIScrollView *)walk;
                        break;
                    }
                    walk = walk.superview;
                }
            } else {
                scrollView = find_main_scroll_view(g_live_window.rootViewController.view);
            }
            if (!scrollView) {
                result = @"No scroll view found\n";
                return;
            }
            CGFloat tickSize = 80.0;
            CGFloat newY = scrollView.contentOffset.y + ticks * tickSize;
            CGFloat maxY = MAX(0, scrollView.contentSize.height - scrollView.bounds.size.height);
            if (newY < 0) newY = 0;
            if (newY > maxY) newY = maxY;
            scrollView.contentOffset = CGPointMake(scrollView.contentOffset.x, newY);
            result = [NSString stringWithFormat:@"Scrolled to y=%.0f (ticks=%ld)\n", newY, (long)ticks];
        });
        return result;
    }

    if ([cmd hasPrefix:@"scrollto "]) {
        NSString *args = [cmd substringFromIndex:9];
        NSArray<NSString *> *parts = [args componentsSeparatedByString:@" "];
        NSString *element_id = parts[0];
        CGFloat margin = parts.count > 1 ? [parts[1] doubleValue] : 0;
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            UIView *view = g_element_ids[element_id];
            if (!view) {
                result = [NSString stringWithFormat:@"Element not found: %@\n", element_id];
                return;
            }
            UIScrollView *scrollView = nil;
            UIView *walk = view.superview;
            while (walk) {
                if ([walk isKindOfClass:[UIScrollView class]]) {
                    scrollView = (UIScrollView *)walk;
                    break;
                }
                walk = walk.superview;
            }
            if (!scrollView) {
                result = @"No scroll view ancestor found\n";
                return;
            }
            CGRect viewRect = [view convertRect:view.bounds toView:scrollView];
            CGFloat targetY = viewRect.origin.y + scrollView.contentOffset.y - margin;
            CGFloat maxY = MAX(0, scrollView.contentSize.height - scrollView.bounds.size.height);
            if (targetY < 0) targetY = 0;
            if (targetY > maxY) targetY = maxY;
            [scrollView setContentOffset:CGPointMake(scrollView.contentOffset.x, targetY) animated:NO];
            result = [NSString stringWithFormat:@"Scrolled to %@ at y=%.0f (margin=%.0f)\n", element_id, targetY, margin];
        });
        return result;
    }

    if ([cmd isEqualToString:@"scrolltop"] || [cmd hasPrefix:@"scrolltop "]) {
        NSString *element_id = cmd.length > 10 ? [cmd substringFromIndex:10] : nil;
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            UIScrollView *scrollView = nil;
            if (element_id.length > 0) {
                UIView *view = g_element_ids[element_id];
                if (!view) {
                    result = [NSString stringWithFormat:@"Element not found: %@\n", element_id];
                    return;
                }
                UIView *walk = view;
                while (walk) {
                    if ([walk isKindOfClass:[UIScrollView class]]) {
                        scrollView = (UIScrollView *)walk;
                        break;
                    }
                    walk = walk.superview;
                }
            } else {
                scrollView = find_main_scroll_view(g_live_window.rootViewController.view);
            }
            if (!scrollView) {
                result = @"No scroll view found\n";
                return;
            }
            [scrollView setContentOffset:CGPointMake(scrollView.contentOffset.x, 0) animated:NO];
            result = @"Scrolled to top\n";
        });
        return result;
    }

    if ([cmd isEqualToString:@"scrollbottom"] || [cmd hasPrefix:@"scrollbottom "]) {
        NSString *element_id = cmd.length > 13 ? [cmd substringFromIndex:13] : nil;
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            UIScrollView *scrollView = nil;
            if (element_id.length > 0) {
                UIView *view = g_element_ids[element_id];
                if (!view) {
                    result = [NSString stringWithFormat:@"Element not found: %@\n", element_id];
                    return;
                }
                UIView *walk = view;
                while (walk) {
                    if ([walk isKindOfClass:[UIScrollView class]]) {
                        scrollView = (UIScrollView *)walk;
                        break;
                    }
                    walk = walk.superview;
                }
            } else {
                scrollView = find_main_scroll_view(g_live_window.rootViewController.view);
            }
            if (!scrollView) {
                result = @"No scroll view found\n";
                return;
            }
            CGFloat maxY = MAX(0, scrollView.contentSize.height - scrollView.bounds.size.height);
            [scrollView setContentOffset:CGPointMake(scrollView.contentOffset.x, maxY) animated:NO];
            result = [NSString stringWithFormat:@"Scrolled to bottom (y=%.0f)\n", maxY];
        });
        return result;
    }

    if ([cmd isEqualToString:@"help"]) {
        return @"Commands:\n"
               "  tree                  - dump view hierarchy\n"
               "  screenshot            - save /tmp/tsn-screenshot.png\n"
               "  click <label>         - click button containing label\n"
               "  clickid <id>          - click element by inspector id\n"
               "  type <text>           - type into first text input\n"
               "  typeid <id> <txt>     - type into specific input by inspector id\n"
               "  find <text>           - find elements containing text\n"
               "  get <id> [prop]       - get element property\n"
               "  probe <id>            - inspect box model and child frames\n"
               "  scroll <id> <ticks>   - scroll by ticks (80px each)\n"
               "  scrollto <id> [margin]- scroll element to top of scroll view\n"
               "  scrolltop <id>        - scroll to top\n"
               "  scrollbottom <id>     - scroll to bottom\n"
               "  help                  - this message\n";
    }

    return [NSString stringWithFormat:@"Unknown command: %@\nType 'help' for usage.\n", cmd];
}

void ui_inspector_start(void) {
    if (g_inspector_started) return;
    int port = inspector_port();
    if (port <= 0) return;
    g_inspector_started = YES;

    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        int fd = socket(AF_INET, SOCK_STREAM, 0);
        if (fd < 0) { perror("[inspector] socket"); return; }

        int reuse = 1;
        setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

        struct sockaddr_in addr;
        memset(&addr, 0, sizeof(addr));
        addr.sin_family = AF_INET;
        addr.sin_port = htons((uint16_t)port);
        addr.sin_addr.s_addr = htonl(INADDR_ANY);

        if (bind(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) { perror("[inspector] bind"); close(fd); return; }
        if (listen(fd, 2) < 0) { perror("[inspector] listen"); close(fd); return; }

        fprintf(stderr, "[inspector] Listening on tcp://127.0.0.1:%d\n", port);

        while (1) {
            int client = accept(fd, NULL, NULL);
            if (client < 0) continue;

            char buf[4096];
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

void ui_set_id(UIHandle v, const char *element_id) {
    id obj = (__bridge id)v;
    NSString *identifier = [NSString stringWithUTF8String:element_id ?: ""];
    if ([obj isKindOfClass:[UIView class]]) {
        UIView *view = (UIView *)obj;
        view.accessibilityIdentifier = identifier;
        if (identifier.length > 0) g_element_ids[identifier] = view;
    }
}
