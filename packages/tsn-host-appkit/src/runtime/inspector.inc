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

static void dump_tree(NSView *view, int depth, NSMutableString *out) {
    NSString *indent = [@"" stringByPaddingToLength:depth * 2 withString:@" " startingAtIndex:0];
    NSRect f = view.frame;
    NSString *type = NSStringFromClass([view class]);

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
        NSButton *btn = (NSButton *)view;
        [out appendFormat:@"%@Button \"%@\" (%.0f×%.0f at %.0f,%.0f)\n", indent, btn.title,
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

static NSString *click_element(NSString *element_id) {
    NSView *view = g_element_ids[element_id];
    if (!view) return [NSString stringWithFormat:@"Element not found: %@", element_id];

    if ([view isKindOfClass:[NSButton class]]) {
        NSButton *btn = (NSButton *)view;
        [btn performClick:nil];
        return [NSString stringWithFormat:@"Clicked: %@", btn.title];
    }

    NSArray<NSGestureRecognizer *> *gestures = view.gestureRecognizers;
    for (NSGestureRecognizer *gesture in gestures) {
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
        NSSearchField *f = (NSSearchField *)view;
        f.stringValue = text;
        NSNotification *n = [NSNotification notificationWithName:NSControlTextDidChangeNotification
                                                          object:f];
        if (f.delegate && [f.delegate respondsToSelector:@selector(controlTextDidChange:)])
            [f.delegate controlTextDidChange:n];
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

static NSString *type_text_into(NSString *element_id, NSString *text) {
    NSView *view = g_element_ids[element_id];
    if (!view) return [NSString stringWithFormat:@"Element not found: %@", element_id];

    if ([view isKindOfClass:[NSSearchField class]]) {
        NSSearchField *f = (NSSearchField *)view;
        f.stringValue = text;
        NSNotification *n = [NSNotification notificationWithName:NSControlTextDidChangeNotification
                                                          object:f];
        if (f.delegate && [f.delegate respondsToSelector:@selector(controlTextDidChange:)])
            [f.delegate controlTextDidChange:n];
        return [NSString stringWithFormat:@"Typed into %@: %@", element_id, text];
    }

    if ([view isKindOfClass:[NSTextField class]]) {
        NSTextField *f = (NSTextField *)view;
        f.stringValue = text;
        NSNotification *n = [NSNotification notificationWithName:NSControlTextDidChangeNotification
                                                          object:f];
        if (f.delegate && [f.delegate respondsToSelector:@selector(controlTextDidChange:)])
            [f.delegate controlTextDidChange:n];
        return [NSString stringWithFormat:@"Typed into %@: %@", element_id, text];
    }

    return [NSString stringWithFormat:@"Element is not text input: %@", element_id];
}

void ui_set_id(UIHandle v, const char *element_id) {
    NSView *view = (__bridge NSView *)v;
    NSString *key = [NSString stringWithUTF8String:element_id];
    g_element_ids[key] = view;
}

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

static NSString *get_property(NSString *element_id, NSString *prop) {
    NSView *view = g_element_ids[element_id];
    if (!view) return [NSString stringWithFormat:@"Element not found: %@\n", element_id];

    if ([prop isEqualToString:@"frame"]) {
        NSRect f = view.frame;
        return [NSString stringWithFormat:@"%.0f×%.0f at %.0f,%.0f\n",
            f.size.width, f.size.height, f.origin.x, f.origin.y];
    }
    if ([prop isEqualToString:@"wframe"]) {
        /* Window-relative frame in top-left coordinates (matching browser convention).
           AppKit's convertRect:toView:nil returns bottom-left origin coords,
           so we flip Y relative to the content view height. */
        NSRect local = view.bounds;
        NSRect windowRect = [view convertRect:local toView:nil];
        NSView *contentView = view.window.contentView;
        CGFloat contentHeight = contentView ? contentView.frame.size.height : windowRect.origin.y + windowRect.size.height;
        CGFloat flippedY = contentHeight - windowRect.origin.y - windowRect.size.height;
        return [NSString stringWithFormat:@"%.0f×%.0f at %.0f,%.0f\n",
            windowRect.size.width, windowRect.size.height,
            windowRect.origin.x, flippedY];
    }
    if ([prop isEqualToString:@"text"]) {
        if ([view isKindOfClass:[NSTextField class]])
            return [NSString stringWithFormat:@"%@\n", ((NSTextField *)view).stringValue];
        if ([view isKindOfClass:[NSButton class]])
            return [NSString stringWithFormat:@"%@\n", ((NSButton *)view).title];
        if ([view isKindOfClass:[NSSearchField class]])
            return [NSString stringWithFormat:@"%@\n", ((NSSearchField *)view).stringValue];
        return @"(no text)\n";
    }
    if ([prop isEqualToString:@"value"]) {
        if ([view isKindOfClass:[NSTextField class]])
            return [NSString stringWithFormat:@"%@\n", ((NSTextField *)view).stringValue];
        if ([view isKindOfClass:[NSSearchField class]])
            return [NSString stringWithFormat:@"%@\n", ((NSSearchField *)view).stringValue];
        if ([view isKindOfClass:[NSProgressIndicator class]]) {
            NSProgressIndicator *pi = (NSProgressIndicator *)view;
            if (pi.indeterminate) return @"indeterminate\n";
            return [NSString stringWithFormat:@"%.2f\n", pi.doubleValue];
        }
        return @"(no value)\n";
    }
    if ([prop isEqualToString:@"placeholder"]) {
        if ([view isKindOfClass:[NSTextField class]]) {
            NSString *placeholder = ((NSTextField *)view).placeholderString ?: @"";
            return [NSString stringWithFormat:@"%@\n", placeholder];
        }
        if ([view isKindOfClass:[NSSearchField class]]) {
            NSString *placeholder = ((NSSearchField *)view).placeholderString ?: @"";
            return [NSString stringWithFormat:@"%@\n", placeholder];
        }
        return @"(no placeholder)\n";
    }
    if ([prop isEqualToString:@"indeterminate"]) {
        if ([view isKindOfClass:[NSProgressIndicator class]])
            return ((NSProgressIndicator *)view).indeterminate ? @"true\n" : @"false\n";
        return @"false\n";
    }
    if ([prop isEqualToString:@"hidden"]) return view.isHidden ? @"true\n" : @"false\n";
    if ([prop isEqualToString:@"children"]) {
        if ([view isKindOfClass:[UIStackContainer class]]) {
            int count = (int)((UIStackContainer *)view).children.count;
            return [NSString stringWithFormat:@"%d children\n", count];
        }
        return [NSString stringWithFormat:@"%d subviews\n", (int)view.subviews.count];
    }
    if ([prop isEqualToString:@"rows"]) {
        if ([view isKindOfClass:[NSScrollView class]]) {
            NSView *document = ((NSScrollView *)view).documentView;
            if ([document isKindOfClass:[NSTableView class]])
                return [NSString stringWithFormat:@"%ld\n", (long)((NSTableView *)document).numberOfRows];
        }
        if ([view isKindOfClass:[NSTableView class]])
            return [NSString stringWithFormat:@"%ld\n", (long)((NSTableView *)view).numberOfRows];
        return @"0\n";
    }
    if ([prop isEqualToString:@"columns"]) {
        if ([view isKindOfClass:[NSScrollView class]]) {
            NSView *document = ((NSScrollView *)view).documentView;
            if ([document isKindOfClass:[NSTableView class]])
                return [NSString stringWithFormat:@"%ld\n", (long)((NSTableView *)document).tableColumns.count];
        }
        if ([view isKindOfClass:[NSTableView class]])
            return [NSString stringWithFormat:@"%ld\n", (long)((NSTableView *)view).tableColumns.count];
        return @"0\n";
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

    NSRect f = view.frame;
    NSString *type = NSStringFromClass([view class]);
    return [NSString stringWithFormat:@"%@ (%.0f×%.0f at %.0f,%.0f)\n", type,
        f.size.width, f.size.height, f.origin.x, f.origin.y];
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
            dump_tree(g_inspect_window.contentView, 1, out);
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
        NSString *eid = parts[0];
        NSString *prop = parts.count > 1 ? parts[1] : @"frame";
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            result = get_property(eid, prop);
        });
        return result;
    }

    /* ── Probe command — box model inspector ────────────────────── */

    if ([cmd hasPrefix:@"probe "]) {
        NSString *eid = [cmd substringFromIndex:6];
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            NSView *view = g_element_ids[eid];
            if (!view) { result = [NSString stringWithFormat:@"Element not found: %@\n", eid]; return; }

            NSRect f = view.frame;
            NSMutableString *out = [NSMutableString new];
            [out appendFormat:@"probe %@\n", eid];
            [out appendFormat:@"  self: %.0f×%.0f at %.0f,%.0f\n", f.size.width, f.size.height, f.origin.x, f.origin.y];

            /* Parent info */
            NSView *parent = view.superview;
            if (parent) {
                NSRect pf = parent.frame;
                [out appendFormat:@"  parent: %.0f×%.0f at %.0f,%.0f", pf.size.width, pf.size.height, pf.origin.x, pf.origin.y];
                if ([parent isKindOfClass:[UIStackContainer class]]) {
                    UIStackContainer *sc = (UIStackContainer *)parent;
                    [out appendFormat:@" (%@)", sc.direction == 0 ? @"VStack" : @"HStack"];
                }
                [out appendString:@"\n"];

                /* Edge gaps: how far is this element from parent edges */
                CGFloat gapLeft = f.origin.x;
                CGFloat gapTop = f.origin.y;
                CGFloat gapRight = pf.size.width - (f.origin.x + f.size.width);
                CGFloat gapBottom = pf.size.height - (f.origin.y + f.size.height);
                [out appendFormat:@"  edges: left=%.0f top=%.0f right=%.0f bottom=%.0f\n", gapLeft, gapTop, gapRight, gapBottom];
            } else {
                [out appendString:@"  parent: (none)\n"];
            }

            /* If this element IS a UIStackContainer, report its padding */
            if ([view isKindOfClass:[UIStackContainer class]]) {
                UIStackContainer *sc = (UIStackContainer *)view;
                [out appendFormat:@"  padding: top=%d right=%d bottom=%d left=%d\n",
                    sc.padding_top, sc.padding_right, sc.padding_bottom, sc.padding_left];
                [out appendFormat:@"  spacing: %d  align_items: %d  justify: %d\n",
                    (int)sc.spacing, sc.align_items, sc.justify_content];
                [out appendFormat:@"  children: %lu\n", (unsigned long)sc.children.count];

                /* Report each child's frame */
                for (NSUInteger i = 0; i < sc.children.count; i++) {
                    NSView *child = sc.children[i];
                    NSRect cf = child.frame;
                    NSString *childType = @"?";
                    if ([child isKindOfClass:[UIStackContainer class]])
                        childType = ((UIStackContainer *)child).direction == 0 ? @"VStack" : @"HStack";
                    else if ([child isKindOfClass:[NSTextField class]])
                        childType = @"Text";
                    else if ([child isKindOfClass:[NSImageView class]])
                        childType = @"Image";
                    else if ([child isKindOfClass:[NSButton class]])
                        childType = @"Button";
                    else if ([child isKindOfClass:[NSBox class]])
                        childType = @"Divider";
                    else
                        childType = NSStringFromClass([child class]);

                    /* Find element ID if registered */
                    NSString *childId = @"";
                    for (NSString *key in g_element_ids) {
                        if (g_element_ids[key] == child) { childId = key; break; }
                    }
                    [out appendFormat:@"    [%lu] %@ %@  %.0f×%.0f at %.0f,%.0f\n",
                        (unsigned long)i, childType, childId,
                        cf.size.width, cf.size.height, cf.origin.x, cf.origin.y];
                }
            }
            result = out;
        });
        return result;
    }

    /* ── Scroll commands ─────────────────────────────────────────── */

    /* Helper: find deepest vertical NSScrollView in view hierarchy */
    static NSScrollView *(^findMainScrollView)(NSView *) = ^NSScrollView *(NSView *root) {
        /* BFS for the largest vertical scroll view (the main content scroller) */
        NSScrollView *best = nil;
        CGFloat bestArea = 0;
        NSMutableArray *queue = [NSMutableArray arrayWithObject:root];
        while (queue.count > 0) {
            NSView *v = queue[0]; [queue removeObjectAtIndex:0];
            if ([v isKindOfClass:[NSScrollView class]]) {
                NSScrollView *sv = (NSScrollView *)v;
                if (sv.hasVerticalScroller || !sv.hasHorizontalScroller) {
                    CGFloat area = sv.frame.size.width * sv.frame.size.height;
                    if (area > bestArea) { best = sv; bestArea = area; }
                }
            }
            for (NSView *sub in v.subviews) [queue addObject:sub];
            if ([v isKindOfClass:[UIStackContainer class]])
                for (NSView *c in ((UIStackContainer *)v).children) [queue addObject:c];
        }
        return best;
    };

    if ([cmd hasPrefix:@"scroll "]) {
        NSString *args = [cmd substringFromIndex:7];
        NSArray *parts = [args componentsSeparatedByString:@" "];
        int ticks = [parts[0] intValue];
        /* If first arg is a number, scroll main scroll view. If it's an ID, scroll that element's ancestor. */
        BOOL isNumber = ticks != 0 || [parts[0] isEqualToString:@"0"];
        NSString *eid = isNumber ? nil : parts[0];
        if (!isNumber && parts.count > 1) ticks = [parts[1] intValue];
        if (isNumber && ticks == 0) ticks = 1;
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            NSScrollView *sv = nil;
            if (eid) {
                NSView *view = g_element_ids[eid];
                if (!view) { result = [NSString stringWithFormat:@"Element not found: %@\n", eid]; return; }
                NSView *walk = view;
                while (walk) {
                    if ([walk isKindOfClass:[NSScrollView class]]) { sv = (NSScrollView *)walk; break; }
                    walk = walk.superview;
                }
            } else {
                sv = findMainScrollView(g_inspect_window.contentView);
            }
            if (!sv) { result = @"No scroll view found\n"; return; }
            NSClipView *clip = sv.contentView;
            NSPoint origin = clip.bounds.origin;
            CGFloat tickSize = 80.0;
            CGFloat newY = origin.y + ticks * tickSize;
            CGFloat maxY = sv.documentView.frame.size.height - clip.bounds.size.height;
            if (newY < 0) newY = 0;
            if (maxY > 0 && newY > maxY) newY = maxY;
            [clip scrollToPoint:NSMakePoint(origin.x, newY)];
            [sv reflectScrolledClipView:clip];
            result = [NSString stringWithFormat:@"Scrolled to y=%.0f (ticks=%d)\n", newY, ticks];
        });
        return result;
    }

    if ([cmd hasPrefix:@"scrollto "]) {
        NSString *args = [cmd substringFromIndex:9];
        NSArray *parts = [args componentsSeparatedByString:@" "];
        NSString *eid = parts[0];
        CGFloat margin = parts.count > 1 ? [parts[1] doubleValue] : 0;
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            NSView *view = g_element_ids[eid];
            if (!view) { result = [NSString stringWithFormat:@"Element not found: %@\n", eid]; return; }
            NSScrollView *sv = nil;
            NSView *walk = view.superview;
            while (walk) {
                if ([walk isKindOfClass:[NSScrollView class]]) { sv = (NSScrollView *)walk; break; }
                walk = walk.superview;
            }
            if (!sv) { result = @"No scroll view ancestor found\n"; return; }
            /* Convert element frame to document view coordinates */
            NSRect viewRect = [view convertRect:view.bounds toView:sv.documentView];
            /* Flip Y for flipped document views */
            CGFloat targetY = viewRect.origin.y - margin;
            if (targetY < 0) targetY = 0;
            CGFloat maxY = sv.documentView.frame.size.height - sv.contentView.bounds.size.height;
            if (targetY > maxY) targetY = maxY;
            [sv.contentView scrollToPoint:NSMakePoint(0, targetY)];
            [sv reflectScrolledClipView:sv.contentView];
            result = [NSString stringWithFormat:@"Scrolled to %@ at y=%.0f (margin=%.0f)\n", eid, targetY, margin];
        });
        return result;
    }

    if ([cmd isEqualToString:@"scrolltop"] || [cmd hasPrefix:@"scrolltop "]) {
        NSString *eid = cmd.length > 10 ? [cmd substringFromIndex:10] : nil;
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            NSScrollView *sv = nil;
            if (eid.length > 0) {
                NSView *view = g_element_ids[eid];
                if (!view) { result = [NSString stringWithFormat:@"Element not found: %@\n", eid]; return; }
                NSView *walk = view;
                while (walk) {
                    if ([walk isKindOfClass:[NSScrollView class]]) { sv = (NSScrollView *)walk; break; }
                    walk = walk.superview;
                }
            } else {
                sv = findMainScrollView(g_inspect_window.contentView);
            }
            if (!sv) { result = @"No scroll view found\n"; return; }
            [sv.contentView scrollToPoint:NSMakePoint(0, 0)];
            [sv reflectScrolledClipView:sv.contentView];
            result = @"Scrolled to top\n";
        });
        return result;
    }

    if ([cmd isEqualToString:@"scrollbottom"] || [cmd hasPrefix:@"scrollbottom "]) {
        NSString *eid = cmd.length > 13 ? [cmd substringFromIndex:13] : nil;
        __block NSString *result = nil;
        dispatch_sync(dispatch_get_main_queue(), ^{
            NSScrollView *sv = nil;
            if (eid.length > 0) {
                NSView *view = g_element_ids[eid];
                if (!view) { result = [NSString stringWithFormat:@"Element not found: %@\n", eid]; return; }
                NSView *walk = view;
                while (walk) {
                    if ([walk isKindOfClass:[NSScrollView class]]) { sv = (NSScrollView *)walk; break; }
                    walk = walk.superview;
                }
            } else {
                sv = findMainScrollView(g_inspect_window.contentView);
            }
            if (!sv) { result = @"No scroll view found\n"; return; }
            CGFloat maxY = sv.documentView.frame.size.height - sv.contentView.bounds.size.height;
            if (maxY < 0) maxY = 0;
            [sv.contentView scrollToPoint:NSMakePoint(0, maxY)];
            [sv reflectScrolledClipView:sv.contentView];
            result = [NSString stringWithFormat:@"Scrolled to bottom (y=%.0f)\n", maxY];
        });
        return result;
    }

    if ([cmd isEqualToString:@"help"]) {
        return @"Commands:\n"
               "  tree                  — dump view hierarchy\n"
               "  screenshot            — save /tmp/strictts-screenshot.png\n"
               "  click <label>         — click button containing label\n"
               "  clickid <id>          — click element by inspector id\n"
               "  type <text>           — type into first search field\n"
               "  typeid <id> <txt>     — type into specific input by inspector id\n"
               "  find <text>           — find elements containing text\n"
               "  get <id> [prop]       — get element property\n"
               "  probe <id>           — box model: edges, padding, children\n"
               "  scroll <id> <ticks>   — scroll by ticks (80px each, negative=up)\n"
               "  scrollto <id> [margin]— scroll element to top of scroll view\n"
               "  scrolltop <id>        — scroll to top\n"
               "  scrollbottom <id>     — scroll to bottom\n"
               "  help                  — this message\n";
    }

    return [NSString stringWithFormat:@"Unknown command: %@\nType 'help' for usage.\n", cmd];
}

void ui_inspector_start(void) {
    for (NSWindow *w in [NSApp windows]) {
        if (w.isVisible) { g_inspect_window = w; break; }
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
