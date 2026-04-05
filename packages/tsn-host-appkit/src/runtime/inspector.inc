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
    if ([prop isEqualToString:@"text"]) {
        if ([view isKindOfClass:[NSTextField class]])
            return [NSString stringWithFormat:@"%@\n", ((NSTextField *)view).stringValue];
        if ([view isKindOfClass:[NSButton class]])
            return [NSString stringWithFormat:@"%@\n", ((NSButton *)view).title];
        return @"(no text)\n";
    }
    if ([prop isEqualToString:@"hidden"]) return view.isHidden ? @"true\n" : @"false\n";
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
