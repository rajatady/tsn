#include <sys/socket.h>
#include <sys/un.h>

static NSString *inspector_socket_path(void) {
    NSString *process = [[NSProcessInfo processInfo] processName];
    if (process.length == 0) process = @"app";
    NSCharacterSet *unsafe = [[NSCharacterSet characterSetWithCharactersInString:
        @"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"] invertedSet];
    NSArray<NSString *> *parts = [process componentsSeparatedByCharactersInSet:unsafe];
    NSString *safe = [[[parts componentsJoinedByString:@"-"]
        stringByTrimmingCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"-"]] lowercaseString];
    if (safe.length == 0) safe = @"app";
    return [NSString stringWithFormat:@"/tmp/strictts-inspect-%@.sock", safe];
}

static TSNShadowNode *inspector_root_node(void) {
    if (!g_inspect_window) return nil;
    TSNShadowNode *node = tsn_shadow_node_for_obj(g_inspect_window);
    if (node) return node;
    return tsn_shadow_node_for_obj(g_inspect_window.contentView);
}

static NSArray<NSView *> *inspector_child_views(NSView *view) {
    TSNShadowNode *node = tsn_shadow_node_for_obj(view);
    if (node && node.children.count > 0) {
        NSMutableArray<NSView *> *views = [NSMutableArray new];
        for (TSNShadowNode *child in node.children) {
            if (child.view) [views addObject:child.view];
        }
        return views;
    }
    return view.subviews ?: @[];
}

static NSString *inspector_node_text(NSView *view) {
    if ([view isKindOfClass:[NSTextField class]]) return ((NSTextField *)view).stringValue ?: @"";
    if ([view isKindOfClass:[NSButton class]]) return ((NSButton *)view).title ?: @"";
    if ([view isKindOfClass:[NSSearchField class]]) return ((NSSearchField *)view).stringValue ?: @"";
    return @"";
}

static void dump_tree_node(TSNShadowNode *node, int depth, NSMutableString *out) {
    if (!node || !node.view) return;
    NSString *indent = [@"" stringByPaddingToLength:depth * 2 withString:@" " startingAtIndex:0];
    NSView *view = node.view;
    NSRect f = view.frame;
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
    if (!g_inspect_window) return @"No window";
    NSString *path = @"/tmp/strictts-screenshot.png";

    dispatch_sync(dispatch_get_main_queue(), ^{
        [g_inspect_window.contentView layoutSubtreeIfNeeded];
        [g_inspect_window displayIfNeeded];
        [g_inspect_window.contentView displayIfNeeded];
        CGWindowID windowID = (CGWindowID)g_inspect_window.windowNumber;
        CGImageRef image = capture_window_image(windowID);

        if (!image) {
            NSView *contentView = g_inspect_window.contentView;
            NSBitmapImageRep *fallback = [contentView bitmapImageRepForCachingDisplayInRect:contentView.bounds];
            [contentView cacheDisplayInRect:contentView.bounds toBitmapImageRep:fallback];
            NSData *fallbackPng = [fallback representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
            [fallbackPng writeToFile:path atomically:YES];
            return;
        }

        NSBitmapImageRep *rep = [[NSBitmapImageRep alloc] initWithCGImage:image];
        CGImageRelease(image);
        NSData *png = [rep representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
        [png writeToFile:path atomically:YES];
    });

    return [NSString stringWithFormat:@"Screenshot saved: %@", path];
}

static NSString *click_button(NSString *label, NSView *view) {
    if ([view isKindOfClass:[NSButton class]]) {
        NSButton *btn = (NSButton *)view;
        if ([btn.title containsString:label]) {
            [btn performClick:nil];
            return [NSString stringWithFormat:@"Clicked: %@", btn.title];
        }
    }

    for (NSView *child in inspector_child_views(view)) {
        NSString *result = click_button(label, child);
        if (result) return result;
    }
    return nil;
}

static NSString *click_element(NSString *element_id) {
    NSView *view = g_element_ids[element_id];
    if (!view) return [NSString stringWithFormat:@"Element not found: %@", element_id];

    if ([view isKindOfClass:[NSButton class]]) {
        NSButton *btn = (NSButton *)view;
        [btn performClick:nil];
        return [NSString stringWithFormat:@"Clicked: %@", btn.title];
    }

    for (NSGestureRecognizer *gesture in view.gestureRecognizers) {
        id target = gesture.target;
        SEL action = gesture.action;
        if (target && action && [target respondsToSelector:action]) {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Warc-performSelector-leaks"
            [target performSelector:action withObject:gesture];
#pragma clang diagnostic pop
            return [NSString stringWithFormat:@"Clicked: %@", element_id];
        }
    }

    return [NSString stringWithFormat:@"Element not clickable: %@", element_id];
}

static NSString *type_text(NSString *text, NSView *view) {
    if ([view isKindOfClass:[NSSearchField class]]) {
        NSSearchField *field = (NSSearchField *)view;
        field.stringValue = text;
        NSNotification *note = [NSNotification notificationWithName:NSControlTextDidChangeNotification object:field];
        if (field.delegate && [field.delegate respondsToSelector:@selector(controlTextDidChange:)]) {
            [field.delegate controlTextDidChange:note];
        }
        return [NSString stringWithFormat:@"Typed: %@", text];
    }
    if ([view isKindOfClass:[NSTextField class]]) {
        NSTextField *field = (NSTextField *)view;
        field.stringValue = text;
        NSNotification *note = [NSNotification notificationWithName:NSControlTextDidChangeNotification object:field];
        if (field.delegate && [field.delegate respondsToSelector:@selector(controlTextDidChange:)]) {
            [field.delegate controlTextDidChange:note];
        }
        return [NSString stringWithFormat:@"Typed: %@", text];
    }

    for (NSView *child in inspector_child_views(view)) {
        NSString *result = type_text(text, child);
        if (result) return result;
    }
    return nil;
}

static NSString *type_text_into(NSString *element_id, NSString *text) {
    NSView *view = g_element_ids[element_id];
    if (!view) return [NSString stringWithFormat:@"Element not found: %@", element_id];

    if ([view isKindOfClass:[NSSearchField class]]) {
        NSSearchField *field = (NSSearchField *)view;
        field.stringValue = text;
        NSNotification *note = [NSNotification notificationWithName:NSControlTextDidChangeNotification object:field];
        if (field.delegate && [field.delegate respondsToSelector:@selector(controlTextDidChange:)]) {
            [field.delegate controlTextDidChange:note];
        }
        return [NSString stringWithFormat:@"Typed into %@: %@", element_id, text];
    }

    if ([view isKindOfClass:[NSTextField class]]) {
        NSTextField *field = (NSTextField *)view;
        field.stringValue = text;
        NSNotification *note = [NSNotification notificationWithName:NSControlTextDidChangeNotification object:field];
        if (field.delegate && [field.delegate respondsToSelector:@selector(controlTextDidChange:)]) {
            [field.delegate controlTextDidChange:note];
        }
        return [NSString stringWithFormat:@"Typed into %@: %@", element_id, text];
    }

    return [NSString stringWithFormat:@"Element is not text input: %@", element_id];
}

void ui_set_id(UIHandle v, const char *element_id) {
    NSView *view = view_for_handle(v);
    if (!view) return;
    NSString *key = [NSString stringWithUTF8String:element_id];
    g_element_ids[key] = view;
}

static void find_text(NSView *view, NSString *query, int depth, NSMutableString *out) {
    NSString *text = inspector_node_text(view);
    if ([text localizedCaseInsensitiveContainsString:query]) {
        NSString *indent = [@"" stringByPaddingToLength:depth * 2 withString:@" " startingAtIndex:0];
        NSRect f = view.frame;
        NSString *type = tsn_kind_name(tsn_shadow_node_for_obj(view));
        [out appendFormat:@"%@%@ \"%@\" (%.0f×%.0f at %.0f,%.0f)\n",
            indent, type, text, f.size.width, f.size.height, f.origin.x, f.origin.y];
    }

    for (NSView *child in inspector_child_views(view)) {
        find_text(child, query, depth + 1, out);
    }
}

static NSString *get_property(NSString *element_id, NSString *prop) {
    NSView *view = g_element_ids[element_id];
    if (!view) return [NSString stringWithFormat:@"Element not found: %@\n", element_id];

    TSNShadowNode *node = tsn_shadow_node_for_obj(view);

    if ([prop isEqualToString:@"frame"]) {
        NSRect f = view.frame;
        return [NSString stringWithFormat:@"%.0f×%.0f at %.0f,%.0f\n",
            f.size.width, f.size.height, f.origin.x, f.origin.y];
    }
    if ([prop isEqualToString:@"wframe"]) {
        NSRect local = view.bounds;
        NSRect windowRect = [view convertRect:local toView:nil];
        NSView *contentView = view.window.contentView;
        CGFloat contentHeight = contentView ? contentView.frame.size.height : windowRect.origin.y + windowRect.size.height;
        CGFloat flippedY = contentHeight - windowRect.origin.y - windowRect.size.height;
        return [NSString stringWithFormat:@"%.0f×%.0f at %.0f,%.0f\n",
            windowRect.size.width, windowRect.size.height, windowRect.origin.x, flippedY];
    }
    if ([prop isEqualToString:@"text"]) {
        NSString *text = inspector_node_text(view);
        return text.length > 0 ? [NSString stringWithFormat:@"%@\n", text] : @"(no text)\n";
    }
    if ([prop isEqualToString:@"value"]) {
        if ([view isKindOfClass:[NSTextField class]]) return [NSString stringWithFormat:@"%@\n", ((NSTextField *)view).stringValue];
        if ([view isKindOfClass:[NSSearchField class]]) return [NSString stringWithFormat:@"%@\n", ((NSSearchField *)view).stringValue];
        if ([view isKindOfClass:[NSProgressIndicator class]]) {
            NSProgressIndicator *indicator = (NSProgressIndicator *)view;
            return indicator.indeterminate ? @"indeterminate\n" : [NSString stringWithFormat:@"%.2f\n", indicator.doubleValue];
        }
        return @"(no value)\n";
    }
    if ([prop isEqualToString:@"placeholder"]) {
        if ([view isKindOfClass:[NSTextField class]]) return [NSString stringWithFormat:@"%@\n", ((NSTextField *)view).placeholderString ?: @""];
        if ([view isKindOfClass:[NSSearchField class]]) return [NSString stringWithFormat:@"%@\n", ((NSSearchField *)view).placeholderString ?: @""];
        return @"(no placeholder)\n";
    }
    if ([prop isEqualToString:@"indeterminate"]) {
        if ([view isKindOfClass:[NSProgressIndicator class]]) return ((NSProgressIndicator *)view).indeterminate ? @"true\n" : @"false\n";
        return @"false\n";
    }
    if ([prop isEqualToString:@"hidden"]) return view.isHidden ? @"true\n" : @"false\n";
    if ([prop isEqualToString:@"children"]) {
        if (node) return [NSString stringWithFormat:@"%d children\n", (int)node.children.count];
        return [NSString stringWithFormat:@"%d subviews\n", (int)view.subviews.count];
    }
    if ([prop isEqualToString:@"rows"]) {
        if ([view isKindOfClass:[NSScrollView class]]) {
            NSView *document = ((NSScrollView *)view).documentView;
            if ([document isKindOfClass:[NSTableView class]]) return [NSString stringWithFormat:@"%ld\n", (long)((NSTableView *)document).numberOfRows];
        }
        if ([view isKindOfClass:[NSTableView class]]) return [NSString stringWithFormat:@"%ld\n", (long)((NSTableView *)view).numberOfRows];
        return @"0\n";
    }
    if ([prop isEqualToString:@"columns"]) {
        if ([view isKindOfClass:[NSScrollView class]]) {
            NSView *document = ((NSScrollView *)view).documentView;
            if ([document isKindOfClass:[NSTableView class]]) return [NSString stringWithFormat:@"%ld\n", (long)((NSTableView *)document).tableColumns.count];
        }
        if ([view isKindOfClass:[NSTableView class]]) return [NSString stringWithFormat:@"%ld\n", (long)((NSTableView *)view).tableColumns.count];
        return @"0\n";
    }
    if ([prop isEqualToString:@"flex"]) {
        if (node && node.yogaNode) return [NSString stringWithFormat:@"%.0f\n", YGNodeStyleGetFlexGrow(node.yogaNode)];
        return @"0\n";
    }
    if ([prop isEqualToString:@"type"]) {
        if (node) return [NSString stringWithFormat:@"%@\n", tsn_kind_name(node)];
        return [NSString stringWithFormat:@"%@\n", NSStringFromClass([view class])];
    }

    NSRect f = view.frame;
    NSString *type = node ? tsn_kind_name(node) : NSStringFromClass([view class]);
    return [NSString stringWithFormat:@"%@ (%.0f×%.0f at %.0f,%.0f)\n",
        type, f.size.width, f.size.height, f.origin.x, f.origin.y];
}

static NSScrollView *find_main_scroll_view(NSView *root) {
    NSScrollView *best = nil;
    CGFloat bestArea = 0;
    NSMutableArray<NSView *> *queue = [NSMutableArray arrayWithObject:root];
    while (queue.count > 0) {
        NSView *view = queue[0];
        [queue removeObjectAtIndex:0];
        if ([view isKindOfClass:[NSScrollView class]]) {
            NSScrollView *scrollView = (NSScrollView *)view;
            if (scrollView.hasVerticalScroller || !scrollView.hasHorizontalScroller) {
                CGFloat area = scrollView.frame.size.width * scrollView.frame.size.height;
                if (area > bestArea) {
                    best = scrollView;
                    bestArea = area;
                }
            }
        }
        for (NSView *child in inspector_child_views(view)) [queue addObject:child];
    }
    return best;
}

static NSString *handle_command(NSString *cmd) {
    cmd = [cmd stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];

    if ([cmd isEqualToString:@"tree"]) {
        if (!g_inspect_window) return @"No window\n";
        __block NSMutableString *out = [NSMutableString new];
        dispatch_sync(dispatch_get_main_queue(), ^{
            NSRect wf = g_inspect_window.frame;
            [out appendFormat:@"Window \"%@\" (%.0f×%.0f)\n",
                g_inspect_window.title, wf.size.width, wf.size.height];
            TSNShadowNode *root = inspector_root_node();
            if (root) {
                for (TSNShadowNode *child in root.children) dump_tree_node(child, 1, out);
            } else {
                for (NSView *subview in g_inspect_window.contentView.subviews) {
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
        if (!g_inspect_window) return @"No window\n";
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            result = click_button(label, g_inspect_window.contentView);
        });
        return result ?: [NSString stringWithFormat:@"Button not found: %@", label];
    }

    if ([cmd hasPrefix:@"clickid "]) {
        NSString *element_id = [cmd substringFromIndex:8];
        if (!g_inspect_window) return @"No window\n";
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            result = click_element(element_id);
        });
        return result ?: [NSString stringWithFormat:@"Element not found: %@", element_id];
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

    if ([cmd hasPrefix:@"typeid "]) {
        NSString *args = [cmd substringFromIndex:7];
        NSRange firstSpace = [args rangeOfString:@" "];
        if (firstSpace.location == NSNotFound) return @"Usage: typeid <id> <text>\n";
        NSString *element_id = [args substringToIndex:firstSpace.location];
        NSString *text = [args substringFromIndex:firstSpace.location + 1];
        if (!g_inspect_window) return @"No window\n";
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            result = type_text_into(element_id, text);
        });
        return result ?: [NSString stringWithFormat:@"Input not found: %@", element_id];
    }

    if ([cmd hasPrefix:@"find "]) {
        NSString *query = [[cmd substringFromIndex:5] stringByTrimmingCharactersInSet:[NSCharacterSet characterSetWithCharactersInString:@"\"'"]];
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
            NSView *view = g_element_ids[element_id];
            if (!view) {
                result = [NSString stringWithFormat:@"Element not found: %@\n", element_id];
                return;
            }

            TSNShadowNode *node = tsn_shadow_node_for_obj(view);
            NSRect f = view.frame;
            NSMutableString *out = [NSMutableString new];
            [out appendFormat:@"probe %@\n", element_id];
            [out appendFormat:@"  self: %.0f×%.0f at %.0f,%.0f\n", f.size.width, f.size.height, f.origin.x, f.origin.y];

            NSView *parent = view.superview;
            if (parent) {
                NSRect pf = parent.frame;
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
                    NSView *child = childNode.view;
                    NSRect cf = child.frame;
                    NSString *childId = @"";
                    for (NSString *key in g_element_ids) {
                        if (g_element_ids[key] == child) { childId = key; break; }
                    }
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
        NSArray *parts = [args componentsSeparatedByString:@" "];
        int ticks = [parts[0] intValue];
        BOOL isNumber = ticks != 0 || [parts[0] isEqualToString:@"0"];
        NSString *element_id = isNumber ? nil : parts[0];
        if (!isNumber && parts.count > 1) ticks = [parts[1] intValue];
        if (isNumber && ticks == 0) ticks = 1;
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            NSScrollView *scrollView = nil;
            if (element_id) {
                NSView *view = g_element_ids[element_id];
                if (!view) {
                    result = [NSString stringWithFormat:@"Element not found: %@\n", element_id];
                    return;
                }
                NSView *walk = view;
                while (walk) {
                    if ([walk isKindOfClass:[NSScrollView class]]) {
                        scrollView = (NSScrollView *)walk;
                        break;
                    }
                    walk = walk.superview;
                }
            } else {
                scrollView = find_main_scroll_view(g_inspect_window.contentView);
            }
            if (!scrollView) {
                result = @"No scroll view found\n";
                return;
            }
            NSClipView *clip = scrollView.contentView;
            NSPoint origin = clip.bounds.origin;
            CGFloat tickSize = 80.0;
            CGFloat newY = origin.y + ticks * tickSize;
            CGFloat maxY = scrollView.documentView.frame.size.height - clip.bounds.size.height;
            if (newY < 0) newY = 0;
            if (maxY > 0 && newY > maxY) newY = maxY;
            [clip scrollToPoint:NSMakePoint(origin.x, newY)];
            [scrollView reflectScrolledClipView:clip];
            result = [NSString stringWithFormat:@"Scrolled to y=%.0f (ticks=%d)\n", newY, ticks];
        });
        return result;
    }

    if ([cmd hasPrefix:@"scrollto "]) {
        NSString *args = [cmd substringFromIndex:9];
        NSArray *parts = [args componentsSeparatedByString:@" "];
        NSString *element_id = parts[0];
        CGFloat margin = parts.count > 1 ? [parts[1] doubleValue] : 0;
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            NSView *view = g_element_ids[element_id];
            if (!view) {
                result = [NSString stringWithFormat:@"Element not found: %@\n", element_id];
                return;
            }
            NSScrollView *scrollView = nil;
            NSView *walk = view.superview;
            while (walk) {
                if ([walk isKindOfClass:[NSScrollView class]]) {
                    scrollView = (NSScrollView *)walk;
                    break;
                }
                walk = walk.superview;
            }
            if (!scrollView) {
                result = @"No scroll view ancestor found\n";
                return;
            }
            NSRect viewRect = [view convertRect:view.bounds toView:scrollView.documentView];
            CGFloat targetY = viewRect.origin.y - margin;
            if (targetY < 0) targetY = 0;
            CGFloat maxY = scrollView.documentView.frame.size.height - scrollView.contentView.bounds.size.height;
            if (targetY > maxY) targetY = maxY;
            [scrollView.contentView scrollToPoint:NSMakePoint(0, targetY)];
            [scrollView reflectScrolledClipView:scrollView.contentView];
            result = [NSString stringWithFormat:@"Scrolled to %@ at y=%.0f (margin=%.0f)\n", element_id, targetY, margin];
        });
        return result;
    }

    if ([cmd isEqualToString:@"scrolltop"] || [cmd hasPrefix:@"scrolltop "]) {
        NSString *element_id = cmd.length > 10 ? [cmd substringFromIndex:10] : nil;
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            NSScrollView *scrollView = nil;
            if (element_id.length > 0) {
                NSView *view = g_element_ids[element_id];
                if (!view) {
                    result = [NSString stringWithFormat:@"Element not found: %@\n", element_id];
                    return;
                }
                NSView *walk = view;
                while (walk) {
                    if ([walk isKindOfClass:[NSScrollView class]]) {
                        scrollView = (NSScrollView *)walk;
                        break;
                    }
                    walk = walk.superview;
                }
            } else {
                scrollView = find_main_scroll_view(g_inspect_window.contentView);
            }
            if (!scrollView) {
                result = @"No scroll view found\n";
                return;
            }
            [scrollView.contentView scrollToPoint:NSMakePoint(0, 0)];
            [scrollView reflectScrolledClipView:scrollView.contentView];
            result = @"Scrolled to top\n";
        });
        return result;
    }

    if ([cmd isEqualToString:@"scrollbottom"] || [cmd hasPrefix:@"scrollbottom "]) {
        NSString *element_id = cmd.length > 13 ? [cmd substringFromIndex:13] : nil;
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            NSScrollView *scrollView = nil;
            if (element_id.length > 0) {
                NSView *view = g_element_ids[element_id];
                if (!view) {
                    result = [NSString stringWithFormat:@"Element not found: %@\n", element_id];
                    return;
                }
                NSView *walk = view;
                while (walk) {
                    if ([walk isKindOfClass:[NSScrollView class]]) {
                        scrollView = (NSScrollView *)walk;
                        break;
                    }
                    walk = walk.superview;
                }
            } else {
                scrollView = find_main_scroll_view(g_inspect_window.contentView);
            }
            if (!scrollView) {
                result = @"No scroll view found\n";
                return;
            }
            CGFloat maxY = scrollView.documentView.frame.size.height - scrollView.contentView.bounds.size.height;
            if (maxY < 0) maxY = 0;
            [scrollView.contentView scrollToPoint:NSMakePoint(0, maxY)];
            [scrollView reflectScrolledClipView:scrollView.contentView];
            result = [NSString stringWithFormat:@"Scrolled to bottom (y=%.0f)\n", maxY];
        });
        return result;
    }

    if ([cmd isEqualToString:@"help"]) {
        return @"Commands:\n"
               "  tree                  - dump view hierarchy\n"
               "  screenshot            - save /tmp/strictts-screenshot.png\n"
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
    for (NSWindow *window in [NSApp windows]) {
        if (window.isVisible) {
            g_inspect_window = window;
            break;
        }
    }

    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        NSString *socketPath = inspector_socket_path();
        unlink(socketPath.fileSystemRepresentation);

        int fd = socket(AF_UNIX, SOCK_STREAM, 0);
        if (fd < 0) { perror("[inspector] socket"); return; }

        struct sockaddr_un addr;
        memset(&addr, 0, sizeof(addr));
        addr.sun_family = AF_UNIX;
        strncpy(addr.sun_path, socketPath.fileSystemRepresentation, sizeof(addr.sun_path) - 1);

        if (bind(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) { perror("[inspector] bind"); close(fd); return; }
        if (listen(fd, 2) < 0) { perror("[inspector] listen"); close(fd); return; }

        fprintf(stderr, "[inspector] Listening on %s\n", socketPath.fileSystemRepresentation);

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
