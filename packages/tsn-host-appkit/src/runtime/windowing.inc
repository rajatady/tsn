/* ─── Error Overlay (Next.js-style) ─────────────────────────────── */

static void ts_error_overlay(const char *title, const char *message,
                              const char *file, int line,
                              const char *stack_trace) {
    void (^show_overlay)(void) = ^{
        NSWindow *win = nil;
        for (NSWindow *w in [NSApp windows]) {
            if (w.isVisible && !w.isMiniaturized) { win = w; break; }
        }
        if (!win) return;

        NSView *content = win.contentView;
        NSRect bounds = content.bounds;

        NSView *overlay = [[NSView alloc] initWithFrame:bounds];
        overlay.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
        overlay.wantsLayer = YES;
        overlay.layer.backgroundColor = [NSColor colorWithRed:0.12 green:0.02 blue:0.02 alpha:0.97].CGColor;

        CGFloat pad = 40;
        CGFloat y = bounds.size.height - pad;

        NSTextField *icon_label = [NSTextField labelWithString:@"⛔"];
        icon_label.font = [NSFont systemFontOfSize:28];
        icon_label.frame = NSMakeRect(pad, y - 36, 40, 36);
        [overlay addSubview:icon_label];

        NSTextField *title_label = [NSTextField labelWithString:
            [NSString stringWithUTF8String:title]];
        title_label.font = [NSFont boldSystemFontOfSize:22];
        title_label.textColor = [NSColor colorWithRed:1.0 green:0.3 blue:0.3 alpha:1.0];
        title_label.frame = NSMakeRect(pad + 44, y - 34, bounds.size.width - 2*pad - 44, 30);
        [overlay addSubview:title_label];
        y -= 50;

        NSView *rule = [[NSView alloc] initWithFrame:NSMakeRect(pad, y, bounds.size.width - 2*pad, 1)];
        rule.wantsLayer = YES;
        rule.layer.backgroundColor = [NSColor colorWithRed:0.4 green:0.15 blue:0.15 alpha:1.0].CGColor;
        [overlay addSubview:rule];
        y -= 24;

        if (file && file[0]) {
            const char *basename = file;
            const char *slash = strrchr(file, '/');
            if (slash) basename = slash + 1;

            NSString *loc = line > 0
                ? [NSString stringWithFormat:@"  %s:%d  ", basename, line]
                : [NSString stringWithFormat:@"  %s  ", basename];

            NSTextField *loc_label = [NSTextField labelWithString:loc];
            loc_label.font = [NSFont monospacedSystemFontOfSize:13 weight:NSFontWeightMedium];
            loc_label.textColor = [NSColor whiteColor];
            loc_label.wantsLayer = YES;
            loc_label.layer.backgroundColor = [NSColor colorWithRed:0.6 green:0.1 blue:0.1 alpha:1.0].CGColor;
            loc_label.layer.cornerRadius = 4;
            [loc_label sizeToFit];
            NSRect lf = loc_label.frame;
            lf.origin = NSMakePoint(pad, y - lf.size.height);
            loc_label.frame = lf;
            [overlay addSubview:loc_label];
            y -= lf.size.height + 16;

            NSTextField *path_label = [NSTextField labelWithString:
                [NSString stringWithUTF8String:file]];
            path_label.font = [NSFont monospacedSystemFontOfSize:11 weight:NSFontWeightRegular];
            path_label.textColor = [NSColor colorWithRed:0.6 green:0.4 blue:0.4 alpha:1.0];
            path_label.frame = NSMakeRect(pad, y - 16, bounds.size.width - 2*pad, 16);
            [overlay addSubview:path_label];
            y -= 28;
        }

        if (message && message[0]) {
            NSTextField *msg = [NSTextField labelWithString:
                [NSString stringWithUTF8String:message]];
            msg.font = [NSFont monospacedSystemFontOfSize:14 weight:NSFontWeightRegular];
            msg.textColor = [NSColor colorWithRed:1.0 green:0.85 blue:0.85 alpha:1.0];
            msg.maximumNumberOfLines = 0;
            msg.lineBreakMode = NSLineBreakByWordWrapping;
            msg.preferredMaxLayoutWidth = bounds.size.width - 2*pad;
            [msg sizeToFit];
            NSRect mf = msg.frame;
            mf.origin = NSMakePoint(pad, y - mf.size.height);
            mf.size.width = bounds.size.width - 2*pad;
            msg.frame = mf;
            [overlay addSubview:msg];
            y -= mf.size.height + 20;
        }

        if (stack_trace && stack_trace[0] && (!message || strcmp(stack_trace, message) != 0)) {
            NSView *stack_rule = [[NSView alloc] initWithFrame:NSMakeRect(pad, y, bounds.size.width - 2*pad, 1)];
            stack_rule.wantsLayer = YES;
            stack_rule.layer.backgroundColor = [NSColor colorWithRed:0.3 green:0.1 blue:0.1 alpha:1.0].CGColor;
            [overlay addSubview:stack_rule];
            y -= 16;

            NSTextField *stack_title = [NSTextField labelWithString:@"Stack Trace"];
            stack_title.font = [NSFont boldSystemFontOfSize:12];
            stack_title.textColor = [NSColor colorWithRed:0.7 green:0.4 blue:0.4 alpha:1.0];
            stack_title.frame = NSMakeRect(pad, y - 16, 200, 16);
            [overlay addSubview:stack_title];
            y -= 24;

            NSTextField *stack = [NSTextField labelWithString:
                [NSString stringWithUTF8String:stack_trace]];
            stack.font = [NSFont monospacedSystemFontOfSize:11 weight:NSFontWeightRegular];
            stack.textColor = [NSColor colorWithRed:0.8 green:0.6 blue:0.6 alpha:1.0];
            stack.maximumNumberOfLines = 0;
            stack.lineBreakMode = NSLineBreakByCharWrapping;
            stack.preferredMaxLayoutWidth = bounds.size.width - 2*pad;
            [stack sizeToFit];
            NSRect sf = stack.frame;
            sf.origin = NSMakePoint(pad, y - sf.size.height);
            sf.size.width = bounds.size.width - 2*pad;
            stack.frame = sf;
            [overlay addSubview:stack];
        }

        NSTextField *watermark = [NSTextField labelWithString:@"StrictTS Error Overlay  ·  Debug Build"];
        watermark.font = [NSFont systemFontOfSize:10 weight:NSFontWeightMedium];
        watermark.textColor = [NSColor colorWithRed:0.5 green:0.25 blue:0.25 alpha:1.0];
        watermark.frame = NSMakeRect(pad, 12, bounds.size.width - 2*pad, 14);
        [overlay addSubview:watermark];

        [content addSubview:overlay positioned:NSWindowAbove relativeTo:nil];
        [content setNeedsDisplay:YES];
        [content displayIfNeeded];
        [win display];
        [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode
            beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];

        NSBitmapImageRep *rep = [content bitmapImageRepForCachingDisplayInRect:content.bounds];
        [content cacheDisplayInRect:content.bounds toBitmapImageRep:rep];
        NSData *png = [rep representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
        [png writeToFile:@"/tmp/strictts-error.png" atomically:YES];
        fprintf(stderr, "\n  \033[90mError screenshot: /tmp/strictts-error.png\033[0m\n\n");
    };

    if ([NSThread isMainThread]) {
        show_overlay();
    } else {
        dispatch_sync(dispatch_get_main_queue(), show_overlay);
    }

    if ([NSThread isMainThread]) {
        NSDate *deadline = [NSDate dateWithTimeIntervalSinceNow:30];
        while ([[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:deadline]) {
            BOOL any_visible = NO;
            for (NSWindow *w in [NSApp windows]) {
                if (w.isVisible) { any_visible = YES; break; }
            }
            if (!any_visible) break;
        }
    }
}

void ui_init(void) {
    g_app = [NSApplication sharedApplication];
    g_app.activationPolicy = NSApplicationActivationPolicyRegular;
    g_render_retained = [NSMutableArray new];
    g_persistent_retained = [NSMutableArray new];
    g_element_ids = [NSMutableDictionary new];

    ts_set_error_overlay(ts_error_overlay);

    NSMenu *bar = [NSMenu new];
    NSMenuItem *item = [NSMenuItem new];
    [bar addItem:item];
    NSMenu *sub = [NSMenu new];
    [sub addItemWithTitle:@"Quit" action:@selector(terminate:) keyEquivalent:@"q"];
    item.submenu = sub;
    g_app.mainMenu = bar;
}

void ui_run(UIHandle root) {
    NSWindow *win = (__bridge NSWindow *)root;
    g_root_window = win;
    g_inspect_window = win;
    [win makeKeyAndOrderFront:nil];
    [g_app activateIgnoringOtherApps:YES];
    ui_inspector_start();
    finish_render_cycle();
    [g_app run];
}

void ui_replace_root(UIHandle root) {
    NSWindow *next = (__bridge NSWindow *)root;
    if (!g_root_window) {
        g_root_window = next;
        finish_render_cycle();
        return;
    }

    NSWindow *current = g_root_window;
    NSRect preservedFrame = current.frame;
    NSString *title = next.title ?: current.title;
    NSString *subtitle = next.subtitle ?: current.subtitle;
    NSAppearance *appearance = next.appearance ?: current.appearance;
    NSColor *background = next.backgroundColor ?: current.backgroundColor;
    NSView *replacement = next.contentView;

    replacement.frame = current.contentView.bounds;
    replacement.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    current.contentView = replacement;
    current.title = title;
    current.subtitle = subtitle;
    current.appearance = appearance;
    current.backgroundColor = background;
    current.titlebarAppearsTransparent = next.titlebarAppearsTransparent;
    NSWindowStyleMask currentMask = current.styleMask;
    NSWindowStyleMask desiredMask = next.styleMask;
    BOOL wantsFullSize = (desiredMask & NSWindowStyleMaskFullSizeContentView) != 0;
    BOOL hasFullSize = (currentMask & NSWindowStyleMaskFullSizeContentView) != 0;
    if (wantsFullSize != hasFullSize) {
        if (wantsFullSize) current.styleMask = currentMask | NSWindowStyleMaskFullSizeContentView;
        else current.styleMask = currentMask & ~NSWindowStyleMaskFullSizeContentView;
    }
    [current setFrame:preservedFrame display:YES];
    [current makeKeyAndOrderFront:nil];
    g_inspect_window = current;

    TSNShadowNode *nextNode = tsn_shadow_node_for_obj(next);
    if (!nextNode) nextNode = tsn_shadow_node_for_obj(replacement);
    if (nextNode) {
        nextNode.window = current;
        nextNode.view = replacement;
        tsn_set_shadow_node_for_obj(current, nextNode);
        tsn_set_shadow_node_for_obj(replacement, nextNode);
    }

    [next orderOut:nil];
    [next close];
    finish_render_cycle();
}

UIHandle ui_window(const char *title, int w, int h, bool dark) {
    NSWindow *win = [[NSWindow alloc] initWithContentRect:NSMakeRect(200, 100, w, h)
        styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable |
                  NSWindowStyleMaskResizable | NSWindowStyleMaskMiniaturizable
        backing:NSBackingStoreBuffered defer:NO];
    win.title = [NSString stringWithUTF8String:title];
    win.titlebarAppearsTransparent = NO;
    win.minSize = NSMakeSize(600, 400);
    if (dark) {
        win.appearance = [NSAppearance appearanceNamed:NSAppearanceNameDarkAqua];
        win.backgroundColor = [NSColor colorWithWhite:0.06 alpha:1];
    }

    UIStackContainer *root = [UIStackContainer new];
    root.direction = 0;
    root.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    root.frame = win.contentView.bounds;
    win.contentView = root;
    tsn_create_window_node(win, root);

    retain_render(win);
    return (__bridge UIHandle)win;
}

void ui_window_subtitle(UIHandle w, const char *sub) {
    NSWindow *win = (__bridge NSWindow *)w;
    win.subtitle = [NSString stringWithUTF8String:sub];
}

void ui_window_toolbar(UIHandle w, bool visible) { /* placeholder */ }

void ui_window_titlebar_transparent(UIHandle w) {
    ((__bridge NSWindow *)w).titlebarAppearsTransparent = YES;
}

void ui_window_fullsize_content(UIHandle w) {
    NSWindow *win = (__bridge NSWindow *)w;
    win.styleMask |= NSWindowStyleMaskFullSizeContentView;
}
