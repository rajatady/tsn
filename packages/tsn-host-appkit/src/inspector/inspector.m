/* ─── Inspector (Dev Tools) ──────────────────────────────────────── */

#include <dlfcn.h>
#include <sys/socket.h>
#include <sys/un.h>

#define INSPECT_SOCK "/tmp/tsn-inspect.sock"

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

typedef CGImageRef (*CGWindowListCreateImageFn)(CGRect, uint32_t, uint32_t, uint32_t);

static CGImageRef capture_window_image(CGWindowID windowID) {
    CGWindowListCreateImageFn fn = (CGWindowListCreateImageFn)dlsym(RTLD_DEFAULT, "CGWindowListCreateImage");
    if (!fn) return NULL;
    return fn(CGRectNull, kCGWindowListOptionIncludingWindow, windowID, kCGWindowImageNominalResolution);
}

/* Take a screenshot of the window */
static NSString *take_screenshot(void) {
    if (!g_inspect_window) return @"No window";
    NSString *path = @"/tmp/tsn-screenshot.png";

    /* Capture the composed window so inspector screenshots match the live app. */
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

    if ([cmd isEqualToString:@"help"]) {
        return @"Commands:\n  tree        — dump view hierarchy\n  screenshot  — save /tmp/tsn-screenshot.png\n  click <lbl> — click button containing label\n  type <text> — type into search field\n  help        — this message\n";
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
