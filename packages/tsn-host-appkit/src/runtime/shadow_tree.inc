/* ─── Shadow Tree ───────────────────────────────────────────────── */

static char kTSNShadowNodeKey;

typedef NS_ENUM(int, TSNNodeKind) {
    TSNNodeKindWindow = 0,
    TSNNodeKindVStack = 1,
    TSNNodeKindHStack = 2,
    TSNNodeKindZStack = 3,
    TSNNodeKindScroll = 4,
    TSNNodeKindLeaf = 5,
};

@interface TSNShadowNode : NSObject
@property TSNNodeKind kind;
@property (nonatomic, strong) NSWindow *window;
@property (nonatomic, strong) NSView *view;
@property (nonatomic, assign) YGNodeRef yogaNode;
@property (nonatomic, assign) BOOL ownsYogaNode;
@property (nonatomic, strong) NSMutableArray<TSNShadowNode *> *children;
@property (nonatomic, weak) TSNShadowNode *parent;
@property int direction;
@property int scrollAxis;  /* 0=vertical, 1=horizontal */
@property (nonatomic, strong) NSView *contentView;
@property (nonatomic, assign) YGNodeRef contentYogaNode;
@property (nonatomic, assign) BOOL ownsContentYogaNode;
@end

@implementation TSNShadowNode
- (instancetype)init {
    self = [super init];
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

static NSString *tsn_kind_name(TSNShadowNode *node) {
    if (!node) return @"Unknown";
    switch (node.kind) {
        case TSNNodeKindWindow: return @"Window";
        case TSNNodeKindVStack: return @"VStack";
        case TSNNodeKindHStack: return @"HStack";
        case TSNNodeKindZStack: return @"ZStack";
        case TSNNodeKindScroll: return @"ScrollView";
        default: break;
    }
    NSView *view = node.view;
    if ([view isKindOfClass:[NSTextField class]]) return @"Text";
    if ([view isKindOfClass:[NSSearchField class]]) return @"Search";
    if ([view isKindOfClass:[NSButton class]]) return @"Button";
    if ([view isKindOfClass:[NSImageView class]]) return @"Image";
    if ([view isKindOfClass:[NSVisualEffectView class]]) return @"BlurView";
    if ([view isKindOfClass:[UISpacer class]]) return @"Spacer";
    if ([view isKindOfClass:[NSBox class]]) return @"Divider";
    Class barChartClass = NSClassFromString(@"UIBarChartView");
    if (barChartClass && [view isKindOfClass:barChartClass]) return @"BarChart";
    Class statClass = NSClassFromString(@"UIStatView");
    if (statClass && [view isKindOfClass:statClass]) return @"Stat";
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

static NSView *tsn_view_for_handle(UIHandle handle) {
    id obj = (__bridge id)handle;
    if ([obj isKindOfClass:[NSWindow class]]) return ((NSWindow *)obj).contentView;
    if ([obj isKindOfClass:[NSView class]]) return (NSView *)obj;
    return nil;
}

static YGNodeRef tsn_create_yoga_node(NSView *view, BOOL measurable, int direction) {
    YGNodeRef node = YGNodeNew();
    YGNodeSetContext(node, (__bridge void *)view);
    if (measurable) YGNodeSetMeasureFunc(node, yoga_measure_func);
    if (direction == 1) YGNodeStyleSetFlexDirection(node, YGFlexDirectionRow);
    else YGNodeStyleSetFlexDirection(node, YGFlexDirectionColumn);
    YGNodeStyleSetAlignItems(node, YGAlignStretch);
    return node;
}

static void tsn_apply_aspect_ratio_if_present(NSView *view, YGNodeRef yogaNode) {
    NSValue *aspectVal = objc_getAssociatedObject(view, &kAspectRatioKey);
    if (!aspectVal || !yogaNode) return;
    NSSize ratio = [aspectVal sizeValue];
    if (ratio.width > 0 && ratio.height > 0) {
        YGNodeStyleSetAspectRatio(yogaNode, ratio.width / ratio.height);
    }
}

static BOOL tsn_is_card_container(NSView *view) {
    NSNumber *value = objc_getAssociatedObject(view, &kCardContainerKey);
    return value ? value.boolValue : NO;
}

static TSNShadowNode *tsn_create_view_node(NSView *view, TSNNodeKind kind, int direction, BOOL measurable) {
    TSNShadowNode *node = [TSNShadowNode new];
    node.kind = kind;
    node.view = view;
    node.direction = direction;
    node.yogaNode = tsn_create_yoga_node(view, measurable, direction);
    node.ownsYogaNode = YES;
    if (!measurable) {
        CGFloat fw = view.frame.size.width;
        CGFloat fh = view.frame.size.height;
        if (fw > 0) YGNodeStyleSetWidth(node.yogaNode, fw);
        if (fh > 0) YGNodeStyleSetHeight(node.yogaNode, fh);
    }
    tsn_apply_aspect_ratio_if_present(view, node.yogaNode);
    tsn_set_shadow_node_for_obj(view, node);
    return node;
}

static TSNShadowNode *tsn_create_container_node(UIStackContainer *view, TSNNodeKind kind, int direction) {
    view.direction = direction;
    return tsn_create_view_node(view, kind, direction, NO);
}

static TSNShadowNode *tsn_create_window_node(NSWindow *window, UIStackContainer *contentView) {
    TSNShadowNode *node = [TSNShadowNode new];
    node.kind = TSNNodeKindWindow;
    node.window = window;
    node.view = contentView;
    node.direction = 0;
    node.yogaNode = tsn_create_yoga_node(contentView, NO, 0);
    node.ownsYogaNode = YES;
    YGNodeStyleSetFlexGrow(node.yogaNode, 1);
    tsn_set_shadow_node_for_obj(window, node);
    tsn_set_shadow_node_for_obj(contentView, node);
    return node;
}

static TSNShadowNode *tsn_create_scroll_node(NSScrollView *scrollView) {
    TSNShadowNode *node = tsn_create_view_node(scrollView, TSNNodeKindScroll, 0, NO);
    YGNodeSetMeasureFunc(node.yogaNode, yoga_measure_func);
    UIStackContainer *content = [UIStackContainer new];
    content.direction = 0;
    content.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    node.contentView = content;
    node.contentYogaNode = tsn_create_yoga_node(content, NO, 0);
    node.ownsContentYogaNode = YES;
    scrollView.documentView = content;
    return node;
}

static YGNodeRef tsn_layout_root_for_parent(TSNShadowNode *node) {
    if (!node) return NULL;
    if (node.kind == TSNNodeKindScroll) return node.contentYogaNode;
    return node.yogaNode;
}

static NSView *tsn_host_container_for_parent(TSNShadowNode *node) {
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

    NSView *host = tsn_host_container_for_parent(parent);
    if (host && child.view.superview != host) [host addSubview:child.view];

    YGNodeRef layoutRoot = tsn_layout_root_for_parent(parent);
    if (layoutRoot && child.yogaNode) {
        uint32_t idx = (uint32_t)YGNodeGetChildCount(layoutRoot);
        YGNodeInsertChild(layoutRoot, child.yogaNode, idx);
        tsn_apply_zstack_constraints_if_needed(parent, child.yogaNode);
        if (tsn_is_card_container(parent.view) && [child.view isKindOfClass:[NSTextField class]]) {
            NSTextField *field = (NSTextField *)child.view;
            YGNodeStyleSetAlignSelf(child.yogaNode, YGAlignFlexStart);
            if (parent.children.count == 1 &&
                !text_uses_custom_line_height(field)) {
                YGNodeStyleSetMargin(child.yogaNode, YGEdgeTop, 4);
            }
        }
        if ([child.view isKindOfClass:[NSBox class]]) {
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

static void tsn_apply_layout_recursive(TSNShadowNode *node, YGNodeRef parentYoga);

static void tsn_layout_scroll_node(TSNShadowNode *node) {
    if (!node || node.kind != TSNNodeKindScroll) return;
    NSScrollView *scrollView = (NSScrollView *)node.view;
    CGFloat viewportWidth = scrollView.bounds.size.width;
    CGFloat viewportHeight = scrollView.bounds.size.height;
    if (viewportWidth <= 0 || viewportHeight <= 0) return;

    if (node.scrollAxis == 1) {
        YGNodeCalculateLayout(node.contentYogaNode, viewportWidth, viewportHeight, YGDirectionLTR);
        CGFloat maxX = viewportWidth;
        CGFloat maxY = viewportHeight;
        tsn_collect_layout_extents(node, node.contentYogaNode, 0, 0, &maxX, &maxY);
        node.contentView.frame = NSMakeRect(0, 0, maxX, MAX(viewportHeight, maxY));
    } else {
        YGNodeCalculateLayout(node.contentYogaNode, viewportWidth, YGUndefined, YGDirectionLTR);
        CGFloat maxX = viewportWidth;
        CGFloat maxY = viewportHeight;
        tsn_collect_layout_extents(node, node.contentYogaNode, 0, 0, &maxX, &maxY);
        node.contentView.frame = NSMakeRect(0, 0, MAX(viewportWidth, maxX), maxY);
    }

    tsn_apply_layout_recursive(node, node.contentYogaNode);
}

static void tsn_apply_layout_recursive(TSNShadowNode *node, YGNodeRef parentYoga) {
    NSUInteger childCount = node.children.count;
    for (NSUInteger i = 0; i < childCount; i++) {
        TSNShadowNode *child = node.children[i];
        YGNodeRef childYoga = parentYoga ? YGNodeGetChild(parentYoga, (uint32_t)i) : NULL;
        if (!childYoga) continue;

        CGFloat x = YGNodeLayoutGetLeft(childYoga);
        CGFloat y = YGNodeLayoutGetTop(childYoga);
        CGFloat w = YGNodeLayoutGetWidth(childYoga);
        CGFloat h = YGNodeLayoutGetHeight(childYoga);
        child.view.frame = NSMakeRect(x, y, w, h);

        if (child.kind == TSNNodeKindScroll) {
            tsn_layout_scroll_node(child);
        } else if (child.children.count > 0) {
            tsn_apply_layout_recursive(child, child.yogaNode);
        }
    }
}

static void tsn_commit_root_layout(TSNShadowNode *node, NSSize size) {
    if (!node || !node.yogaNode) return;
    YGNodeCalculateLayout(node.yogaNode, size.width, size.height, YGDirectionLTR);
    tsn_apply_layout_recursive(node, node.yogaNode);
}
