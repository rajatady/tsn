/*
 * StrictTS Native UI Runtime — GTK4 implementation (Linux)
 *
 * Implements the same ui.h contract as the AppKit host.
 * Every ui_* function creates real GTK4 widgets.
 *
 * GTK4 mapping:
 *   ui_window   → GtkWindow
 *   ui_vstack   → GtkBox(VERTICAL)
 *   ui_hstack   → GtkBox(HORIZONTAL)
 *   ui_text     → GtkLabel
 *   ui_button   → GtkButton
 *   ui_scroll   → GtkScrolledWindow
 *   ui_card     → GtkFrame with CSS styling
 *   ui_sidebar  → GtkBox with background CSS
 */

#include <gtk/gtk.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include "ui.h"
#include "runtime.h"

/* ─── Global State ───────────────────────────────────────────────── */

static GtkApplication *g_app = NULL;
static GtkWindow *g_root_window = NULL;
static GtkCssProvider *g_css_provider = NULL;

/* Persistent storage for callback data (prevent GC of closures) */
typedef struct CallbackData {
    UIClickFn fn;
    int tag;
} CallbackData;

typedef struct TextCallbackData {
    UITextChangedFn fn;
} TextCallbackData;

typedef struct TimerCallbackData {
    UITimerFn fn;
} TimerCallbackData;

/* Simple retained object list to prevent freeing callback data */
#define MAX_RETAINED 4096
static void *g_retained[MAX_RETAINED];
static int g_retained_count = 0;

static void retain(void *ptr) {
    if (g_retained_count < MAX_RETAINED) g_retained[g_retained_count++] = ptr;
}

/* ─── CSS Helpers ────────────────────────────────────────────────── */

static const char *DARK_CSS =
    "window { background-color: #0f0f0f; }\n"
    "label { color: #e6e6e6; }\n"
    ".secondary-label { color: #666666; font-size: 11px; }\n"
    ".mono { font-family: monospace; }\n"
    ".card { background-color: #1f1f1f; border-radius: 12px; padding: 12px; }\n"
    ".sidebar { background-color: #161616; }\n"
    ".sidebar-header { color: #737373; font-size: 10px; font-weight: bold; }\n"
    ".badge { border-radius: 8px; padding: 2px 8px; font-size: 10px; font-weight: bold; color: white; }\n"
    ".stat-value { font-size: 28px; font-weight: bold; color: #f2f2f2; font-variant-numeric: tabular-nums; }\n"
    ".stat-label { font-size: 11px; font-weight: 500; color: #808080; }\n"
    ".search-entry { background-color: #1a1a1a; color: #e6e6e6; border-radius: 6px; }\n"
    ".text-field { background-color: transparent; color: #e6e6e6; border-radius: 6px; }\n"
    ".btn-prominent { background-color: @accent_color; color: white; border-radius: 999px; font-weight: bold; padding: 8px 20px; }\n"
    ".btn-destructive { background-color: #e53e3e; color: white; border-radius: 999px; font-weight: bold; padding: 8px 16px; }\n"
    ".btn-borderless { background: none; color: #3b82f6; border: none; font-weight: bold; }\n"
    ".btn-nav { background: none; color: #e0e0e0; border: none; border-radius: 12px; padding: 8px 12px; }\n"
    ".btn-pill { background-color: #383838; color: #3b82f6; border-radius: 12px; padding: 8px 12px; font-weight: bold; }\n"
    ".btn-white { background-color: white; color: #3b82f6; border-radius: 999px; padding: 4px 16px; font-weight: bold; }\n"
    ".btn-gray { background-color: #404040; color: #ebebeb; border-radius: 999px; padding: 5px 12px; font-weight: bold; }\n"
    ".divider { background-color: #333333; min-height: 1px; }\n"
    ".progress-bar trough { background-color: #333333; }\n";

static void apply_system_color_css(GtkWidget *w, int color_idx, const char *property) {
    static const char *color_map[] = {
        "#e6e6e6", "#999999", "#666666", "#3b82f6", "#22c55e",
        "#ef4444", "#f97316", "#eab308", "#a855f7", "#ec4899",
        "#14b8a6", "#6366f1", "#06b6d4"
    };
    const char *hex = (color_idx >= 0 && color_idx < 13) ? color_map[color_idx] : "#e6e6e6";

    char css[256];
    snprintf(css, sizeof(css), "* { %s: %s; }", property, hex);

    GtkCssProvider *p = gtk_css_provider_new();
    gtk_css_provider_load_from_string(p, css);
    gtk_style_context_add_provider(
        gtk_widget_get_style_context(w),
        GTK_STYLE_PROVIDER(p),
        GTK_STYLE_PROVIDER_PRIORITY_APPLICATION + 1
    );
}

static void add_css_class(GtkWidget *w, const char *cls) {
    gtk_widget_add_css_class(w, cls);
}

/* ─── App & Window ───────────────────────────────────────────────── */

void ui_init(void) {
    g_app = gtk_application_new("dev.strictts.app", G_APPLICATION_DEFAULT_FLAGS);

    /* Install dark theme CSS */
    g_css_provider = gtk_css_provider_new();
    gtk_css_provider_load_from_string(g_css_provider, DARK_CSS);
    gtk_style_context_add_provider_for_display(
        gdk_display_get_default(),
        GTK_STYLE_PROVIDER(g_css_provider),
        GTK_STYLE_PROVIDER_PRIORITY_APPLICATION
    );

    /* Request dark color scheme */
    GtkSettings *settings = gtk_settings_get_default();
    g_object_set(settings, "gtk-application-prefer-dark-theme", TRUE, NULL);

    ts_set_error_overlay(NULL); /* no GUI overlay on Linux yet — terminal only */
}

static void on_activate(GtkApplication *app, gpointer user_data) {
    GtkWindow *win = GTK_WINDOW(user_data);
    gtk_window_set_application(win, app);
    gtk_window_present(win);
}

void ui_run(UIHandle root) {
    GtkWindow *win = GTK_WINDOW(root);
    g_root_window = win;

    g_signal_connect(g_app, "activate", G_CALLBACK(on_activate), win);
    g_application_run(G_APPLICATION(g_app), 0, NULL);
}

void ui_replace_root(UIHandle root) {
    GtkWindow *next = GTK_WINDOW(root);
    if (!g_root_window) {
        g_root_window = next;
        return;
    }
    /* Replace content of existing window */
    GtkWidget *new_child = gtk_window_get_child(next);
    if (new_child) {
        g_object_ref(new_child);
        gtk_window_set_child(next, NULL);
        gtk_window_set_child(g_root_window, new_child);
        g_object_unref(new_child);
    }
    gtk_window_destroy(next);
}

UIHandle ui_window(const char *title, int w, int h, bool dark) {
    GtkWidget *win = gtk_window_new();
    gtk_window_set_title(GTK_WINDOW(win), title);
    gtk_window_set_default_size(GTK_WINDOW(win), w, h);

    /* Root vstack as content */
    GtkWidget *root = gtk_box_new(GTK_ORIENTATION_VERTICAL, 8);
    gtk_widget_set_hexpand(root, TRUE);
    gtk_widget_set_vexpand(root, TRUE);
    gtk_window_set_child(GTK_WINDOW(win), root);

    return (UIHandle)win;
}

void ui_window_subtitle(UIHandle w, const char *sub) {
    /* GTK4 doesn't have native subtitles — ignore */
}

void ui_window_toolbar(UIHandle w, bool visible) { /* no-op on GTK */ }
void ui_window_titlebar_transparent(UIHandle w) { /* no-op on GTK */ }
void ui_window_fullsize_content(UIHandle w) { /* no-op on GTK */ }

/* ─── Layout ─────────────────────────────────────────────────────── */

UIHandle ui_vstack(void) {
    GtkWidget *box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 8);
    gtk_widget_set_hexpand(box, TRUE);
    return (UIHandle)box;
}

UIHandle ui_hstack(void) {
    GtkWidget *box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 8);
    gtk_widget_set_vexpand(box, FALSE);
    return (UIHandle)box;
}

void ui_set_padding(UIHandle v, int top, int right, int bottom, int left) {
    GtkWidget *w = GTK_WIDGET(v);
    gtk_widget_set_margin_top(w, top);
    gtk_widget_set_margin_end(w, right);
    gtk_widget_set_margin_bottom(w, bottom);
    gtk_widget_set_margin_start(w, left);
}

void ui_set_spacing(UIHandle v, int spacing) {
    if (GTK_IS_BOX(v)) gtk_box_set_spacing(GTK_BOX(v), spacing);
}

void ui_set_flex(UIHandle v, int flex) {
    GtkWidget *w = GTK_WIDGET(v);
    if (flex > 0) {
        gtk_widget_set_hexpand(w, TRUE);
        gtk_widget_set_vexpand(w, TRUE);
    }
}

void ui_set_size(UIHandle v, int w, int h) {
    GtkWidget *widget = GTK_WIDGET(v);
    if (w >= 0) gtk_widget_set_size_request(widget, w, -1);
    if (h >= 0) gtk_widget_set_size_request(widget, -1, h);
    if (w >= 0 && h >= 0) gtk_widget_set_size_request(widget, w, h);
}

void ui_set_min_size(UIHandle v, int w, int h) {
    GtkWidget *widget = GTK_WIDGET(v);
    if (w >= 0 || h >= 0) gtk_widget_set_size_request(widget, w, h);
}

void ui_set_max_size(UIHandle v, int w, int h) {
    /* GTK doesn't have direct max-size — use size request as best effort */
}

void ui_set_alignment(UIHandle v, int align) {
    GtkWidget *w = GTK_WIDGET(v);
    switch (align) {
        case 0: gtk_widget_set_halign(w, GTK_ALIGN_START); break;
        case 1: gtk_widget_set_halign(w, GTK_ALIGN_CENTER); break;
        case 2: gtk_widget_set_halign(w, GTK_ALIGN_END); break;
    }
}

void ui_add_child(UIHandle parent, UIHandle child) {
    GtkWidget *p = GTK_WIDGET(parent);
    GtkWidget *c = GTK_WIDGET(child);

    if (GTK_IS_WINDOW(p)) {
        /* Window's child is the root box — add to it */
        GtkWidget *root = gtk_window_get_child(GTK_WINDOW(p));
        if (GTK_IS_BOX(root)) {
            gtk_box_append(GTK_BOX(root), c);
        } else {
            gtk_window_set_child(GTK_WINDOW(p), c);
        }
    } else if (GTK_IS_BOX(p)) {
        gtk_box_append(GTK_BOX(p), c);
    } else if (GTK_IS_SCROLLED_WINDOW(p)) {
        gtk_scrolled_window_set_child(GTK_SCROLLED_WINDOW(p), c);
    } else if (GTK_IS_OVERLAY(p)) {
        gtk_overlay_set_child(GTK_OVERLAY(p), c);
    } else {
        /* Generic: try to set as child */
        if (GTK_IS_FRAME(p)) {
            gtk_frame_set_child(GTK_FRAME(p), c);
        }
    }
}

UIHandle ui_spacer(void) {
    GtkWidget *spacer = gtk_box_new(GTK_ORIENTATION_VERTICAL, 0);
    gtk_widget_set_hexpand(spacer, TRUE);
    gtk_widget_set_vexpand(spacer, TRUE);
    return (UIHandle)spacer;
}

UIHandle ui_divider(void) {
    GtkWidget *sep = gtk_separator_new(GTK_ORIENTATION_HORIZONTAL);
    add_css_class(sep, "divider");
    return (UIHandle)sep;
}

/* ─── Visual Effect (blur) ───────────────────────────────────────── */

UIHandle ui_blur_view(int material) {
    /* No vibrancy on GTK — use a styled box as substitute */
    GtkWidget *box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 0);
    add_css_class(box, "sidebar");
    return (UIHandle)box;
}

/* ─── Text ───────────────────────────────────────────────────────── */

UIHandle ui_text(const char *content, int size, bool bold) {
    GtkWidget *label = gtk_label_new(content);
    gtk_label_set_wrap(GTK_LABEL(label), TRUE);
    gtk_label_set_xalign(GTK_LABEL(label), 0);

    char css[256];
    snprintf(css, sizeof(css), "label { font-size: %dpx; font-weight: %s; color: #e6e6e6; }",
             size, bold ? "bold" : "normal");
    GtkCssProvider *p = gtk_css_provider_new();
    gtk_css_provider_load_from_string(p, css);
    gtk_style_context_add_provider(
        gtk_widget_get_style_context(label),
        GTK_STYLE_PROVIDER(p),
        GTK_STYLE_PROVIDER_PRIORITY_APPLICATION + 1
    );

    return (UIHandle)label;
}

UIHandle ui_text_mono(const char *content, int size, bool bold) {
    UIHandle h = ui_text(content, size, bold);
    add_css_class(GTK_WIDGET(h), "mono");

    char css[128];
    snprintf(css, sizeof(css), "label { font-family: monospace; font-size: %dpx; }", size);
    GtkCssProvider *p = gtk_css_provider_new();
    gtk_css_provider_load_from_string(p, css);
    gtk_style_context_add_provider(
        gtk_widget_get_style_context(GTK_WIDGET(h)),
        GTK_STYLE_PROVIDER(p),
        GTK_STYLE_PROVIDER_PRIORITY_APPLICATION + 2
    );

    return h;
}

void ui_text_set_color_rgb(UIHandle t, double r, double g, double b, double a) {
    char css[128];
    snprintf(css, sizeof(css), "label { color: rgba(%d,%d,%d,%.2f); }",
             (int)(r*255), (int)(g*255), (int)(b*255), a);
    GtkCssProvider *p = gtk_css_provider_new();
    gtk_css_provider_load_from_string(p, css);
    gtk_style_context_add_provider(
        gtk_widget_get_style_context(GTK_WIDGET(t)),
        GTK_STYLE_PROVIDER(p),
        GTK_STYLE_PROVIDER_PRIORITY_APPLICATION + 2
    );
}

void ui_text_set_color_system(UIHandle t, int color) {
    apply_system_color_css(GTK_WIDGET(t), color, "color");
}

void ui_text_set_selectable(UIHandle t, bool sel) {
    if (GTK_IS_LABEL(t)) gtk_label_set_selectable(GTK_LABEL(t), sel);
}

UIHandle ui_label(const char *content) {
    UIHandle h = ui_text(content, 11, false);
    add_css_class(GTK_WIDGET(h), "secondary-label");
    return h;
}

/* ─── Symbols (icon fallback) ────────────────────────────────────── */

UIHandle ui_symbol(const char *name, int size) {
    /* Map common SF Symbol names to freedesktop icon names */
    GtkWidget *img = gtk_image_new_from_icon_name(name);
    gtk_image_set_pixel_size(GTK_IMAGE(img), size);
    return (UIHandle)img;
}

void ui_symbol_set_color(UIHandle s, int c) {
    apply_system_color_css(GTK_WIDGET(s), c, "color");
}

/* ─── Images ─────────────────────────────────────────────────────── */

UIHandle ui_image(const char *path) {
    GtkWidget *img;
    if (strncmp(path, "http://", 7) == 0 || strncmp(path, "https://", 8) == 0) {
        /* Network images not supported yet — show placeholder */
        img = gtk_image_new_from_icon_name("image-missing");
    } else {
        img = gtk_image_new_from_file(path);
    }
    return (UIHandle)img;
}

/* ─── Text Field / Search ────────────────────────────────────────── */

UIHandle ui_text_field(const char *placeholder) {
    GtkWidget *entry = gtk_entry_new();
    gtk_entry_set_placeholder_text(GTK_ENTRY(entry), placeholder);
    add_css_class(entry, "text-field");
    return (UIHandle)entry;
}

UIHandle ui_search_field(const char *placeholder) {
    GtkWidget *entry = gtk_search_entry_new();
    gtk_widget_set_size_request(entry, 300, -1);
    add_css_class(entry, "search-entry");
    return (UIHandle)entry;
}

static void on_search_changed(GtkSearchEntry *entry, gpointer user_data) {
    TextCallbackData *d = (TextCallbackData *)user_data;
    const char *text = gtk_editable_get_text(GTK_EDITABLE(entry));
    if (d->fn) d->fn(text);
}

static void on_entry_changed(GtkEditable *editable, gpointer user_data) {
    TextCallbackData *d = (TextCallbackData *)user_data;
    const char *text = gtk_editable_get_text(editable);
    if (d->fn) d->fn(text);
}

void ui_on_text_changed(UIHandle field, UITextChangedFn fn) {
    TextCallbackData *d = (TextCallbackData *)malloc(sizeof(TextCallbackData));
    d->fn = fn;
    retain(d);

    if (GTK_IS_SEARCH_ENTRY(field)) {
        g_signal_connect(field, "search-changed", G_CALLBACK(on_search_changed), d);
    } else if (GTK_IS_EDITABLE(field)) {
        g_signal_connect(field, "changed", G_CALLBACK(on_entry_changed), d);
    }
}

void ui_text_input_set_value(UIHandle field, const char *text) {
    if (GTK_IS_EDITABLE(field)) {
        gtk_editable_set_text(GTK_EDITABLE(field), text ? text : "");
    }
}

/* ─── Buttons ────────────────────────────────────────────────────── */

static void on_button_clicked(GtkButton *btn, gpointer user_data) {
    CallbackData *d = (CallbackData *)user_data;
    if (d->fn) d->fn(d->tag);
}

UIHandle ui_button(const char *label, UIClickFn fn, int tag) {
    GtkWidget *btn = gtk_button_new_with_label(label);
    if (fn) {
        CallbackData *d = (CallbackData *)malloc(sizeof(CallbackData));
        d->fn = fn; d->tag = tag;
        retain(d);
        g_signal_connect(btn, "clicked", G_CALLBACK(on_button_clicked), d);
    }
    return (UIHandle)btn;
}

UIHandle ui_button_icon(const char *icon_name, const char *label, UIClickFn fn, int tag) {
    GtkWidget *btn = gtk_button_new_with_label(label);
    GtkWidget *icon = gtk_image_new_from_icon_name(icon_name);
    gtk_button_set_icon_name(GTK_BUTTON(btn), icon_name);
    (void)icon;
    if (fn) {
        CallbackData *d = (CallbackData *)malloc(sizeof(CallbackData));
        d->fn = fn; d->tag = tag;
        retain(d);
        g_signal_connect(btn, "clicked", G_CALLBACK(on_button_clicked), d);
    }
    return (UIHandle)btn;
}

void ui_button_set_style(UIHandle b, int style) {
    GtkWidget *btn = GTK_WIDGET(b);
    switch (style) {
        case 1: add_css_class(btn, "btn-prominent"); break;
        case 2: add_css_class(btn, "btn-destructive"); break;
        case 3: add_css_class(btn, "btn-borderless"); break;
        case 4: add_css_class(btn, "btn-nav"); break;
        case 5: add_css_class(btn, "btn-pill"); break;
        case 6: add_css_class(btn, "btn-white"); break;
        case 7: add_css_class(btn, "btn-gray"); break;
    }
}

static void on_gesture_click(GtkGestureClick *gesture, int n_press, double x, double y, gpointer user_data) {
    CallbackData *d = (CallbackData *)user_data;
    if (d->fn) d->fn(d->tag);
}

void ui_on_click(UIHandle v, UIClickFn fn, int tag) {
    if (!fn) return;
    CallbackData *d = (CallbackData *)malloc(sizeof(CallbackData));
    d->fn = fn; d->tag = tag;
    retain(d);

    GtkGesture *gesture = gtk_gesture_click_new();
    g_signal_connect(gesture, "pressed", G_CALLBACK(on_gesture_click), d);
    gtk_widget_add_controller(GTK_WIDGET(v), GTK_EVENT_CONTROLLER(gesture));
}

/* ─── Segmented Control ──────────────────────────────────────────── */

UIHandle ui_segmented(int count, const char **labels) {
    GtkWidget *box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 0);
    for (int i = 0; i < count; i++) {
        GtkWidget *btn = gtk_toggle_button_new_with_label(labels[i]);
        if (i == 0) gtk_toggle_button_set_active(GTK_TOGGLE_BUTTON(btn), TRUE);
        gtk_box_append(GTK_BOX(box), btn);
    }
    return (UIHandle)box;
}

void ui_segmented_on_change(UIHandle seg, UISegmentFn fn) { /* TODO */ }

/* ─── Toggle ─────────────────────────────────────────────────────── */

UIHandle ui_toggle(const char *label, bool initial) {
    GtkWidget *sw = gtk_switch_new();
    gtk_switch_set_active(GTK_SWITCH(sw), initial);
    return (UIHandle)sw;
}

void ui_toggle_on_change(UIHandle tog, UIToggleFn fn) { /* TODO */ }

/* ─── Progress ───────────────────────────────────────────────────── */

UIHandle ui_progress(double value) {
    GtkWidget *pb = gtk_progress_bar_new();
    add_css_class(pb, "progress-bar");
    if (value < 0) {
        gtk_progress_bar_pulse(GTK_PROGRESS_BAR(pb));
    } else {
        gtk_progress_bar_set_fraction(GTK_PROGRESS_BAR(pb), value);
    }
    return (UIHandle)pb;
}

void ui_progress_set(UIHandle p, double value) {
    if (GTK_IS_PROGRESS_BAR(p))
        gtk_progress_bar_set_fraction(GTK_PROGRESS_BAR(p), value);
}

/* ─── Badge ──────────────────────────────────────────────────────── */

UIHandle ui_badge(const char *text, int sc) {
    GtkWidget *label = gtk_label_new(text);
    add_css_class(label, "badge");
    apply_system_color_css(label, sc, "background-color");
    return (UIHandle)label;
}

/* ─── Card ───────────────────────────────────────────────────────── */

UIHandle ui_card(void) {
    GtkWidget *box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 8);
    add_css_class(box, "card");
    gtk_widget_set_margin_top(box, 0);
    return (UIHandle)box;
}

void ui_card_set_color(UIHandle c, double r, double g, double b, double a) {
    char css[128];
    snprintf(css, sizeof(css), "box { background-color: rgba(%d,%d,%d,%.2f); border-radius: 12px; }",
             (int)(r*255), (int)(g*255), (int)(b*255), a);
    GtkCssProvider *p = gtk_css_provider_new();
    gtk_css_provider_load_from_string(p, css);
    gtk_style_context_add_provider(
        gtk_widget_get_style_context(GTK_WIDGET(c)),
        GTK_STYLE_PROVIDER(p),
        GTK_STYLE_PROVIDER_PRIORITY_APPLICATION + 1
    );
}

/* ─── Stat Card ──────────────────────────────────────────────────── */

UIHandle ui_stat(const char *value, const char *label, int sc) {
    GtkWidget *box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 4);
    add_css_class(box, "card");
    gtk_widget_set_size_request(box, 160, 80);

    GtkWidget *val = gtk_label_new(value);
    add_css_class(val, "stat-value");
    gtk_label_set_xalign(GTK_LABEL(val), 0);
    gtk_box_append(GTK_BOX(box), val);

    GtkWidget *lbl = gtk_label_new(label);
    add_css_class(lbl, "stat-label");
    gtk_label_set_xalign(GTK_LABEL(lbl), 0);
    gtk_box_append(GTK_BOX(box), lbl);

    return (UIHandle)box;
}

/* ─── Sidebar ────────────────────────────────────────────────────── */

UIHandle ui_sidebar(int width) {
    GtkWidget *box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 2);
    add_css_class(box, "sidebar");
    gtk_widget_set_size_request(box, width, -1);
    gtk_widget_set_margin_top(box, 8);
    gtk_widget_set_margin_start(box, 8);
    gtk_widget_set_margin_end(box, 8);
    return (UIHandle)box;
}

UIHandle ui_sidebar_section(UIHandle sidebar, const char *header) {
    GtkWidget *label = gtk_label_new(header);
    add_css_class(label, "sidebar-header");
    gtk_label_set_xalign(GTK_LABEL(label), 0);
    gtk_box_append(GTK_BOX(sidebar), label);
    return sidebar;
}

UIHandle ui_sidebar_item(UIHandle section, const char *label, const char *sf_symbol,
                         int tag, UIClickFn fn) {
    UIHandle btn = ui_button(label, fn, tag);
    add_css_class(GTK_WIDGET(btn), "btn-nav");
    gtk_box_append(GTK_BOX(section), GTK_WIDGET(btn));
    return btn;
}

void ui_sidebar_item_set_badge(UIHandle item, const char *badge) { /* TODO */ }

/* ─── Data Table ─────────────────────────────────────────────────── */

/* Simplified table using a GtkBox grid — full GtkColumnView is complex */
static UITableCellFn g_table_cell_fn = NULL;
static void *g_table_cell_ctx = NULL;

UIHandle ui_data_table(void) {
    GtkWidget *scroll = gtk_scrolled_window_new();
    gtk_scrolled_window_set_policy(GTK_SCROLLED_WINDOW(scroll),
        GTK_POLICY_AUTOMATIC, GTK_POLICY_AUTOMATIC);

    GtkWidget *box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 0);
    gtk_scrolled_window_set_child(GTK_SCROLLED_WINDOW(scroll), box);

    return (UIHandle)scroll;
}

void ui_data_table_add_column(UIHandle tbl, const char *id, const char *title, int width) {
    /* Column headers tracked via CSS data — simplified for now */
}

void ui_data_table_set_data(UIHandle tbl, int rows, UITableCellFn fn, void *ctx) {
    g_table_cell_fn = fn;
    g_table_cell_ctx = ctx;
    /* Full table rendering would rebuild the listbox — placeholder */
}

void ui_data_table_set_row_height(UIHandle tbl, int h) { /* placeholder */ }
void ui_data_table_set_alternating(UIHandle tbl, bool alt) { /* placeholder */ }

/* ─── Bar Chart ──────────────────────────────────────────────────── */

UIHandle ui_bar_chart(int height) {
    GtkWidget *da = gtk_drawing_area_new();
    gtk_widget_set_size_request(da, -1, height > 0 ? height : 200);
    return (UIHandle)da;
}

void ui_bar_chart_add(UIHandle chart, const char *label, double value, int sc) {
    /* Drawing area chart — would need cairo draw function — placeholder */
}

void ui_bar_chart_set_title(UIHandle chart, const char *title) { /* placeholder */ }

/* ─── Sparkline ──────────────────────────────────────────────────── */

UIHandle ui_sparkline(int w, int h) {
    return ui_bar_chart(h);
}

void ui_sparkline_set_values(UIHandle s, double *v, int c, int sc) { /* placeholder */ }

/* ─── Scroll View ────────────────────────────────────────────────── */

UIHandle ui_scroll(void) {
    GtkWidget *sw = gtk_scrolled_window_new();
    gtk_scrolled_window_set_policy(GTK_SCROLLED_WINDOW(sw),
        GTK_POLICY_NEVER, GTK_POLICY_AUTOMATIC);
    return (UIHandle)sw;
}

void ui_scroll_set_axis(UIHandle s, int axis) {
    if (!GTK_IS_SCROLLED_WINDOW(s)) return;
    if (axis == 1) {
        gtk_scrolled_window_set_policy(GTK_SCROLLED_WINDOW(s),
            GTK_POLICY_AUTOMATIC, GTK_POLICY_NEVER);
    } else {
        gtk_scrolled_window_set_policy(GTK_SCROLLED_WINDOW(s),
            GTK_POLICY_NEVER, GTK_POLICY_AUTOMATIC);
    }
}

/* ─── Tab View ───────────────────────────────────────────────────── */

UIHandle ui_tab_view(void) {
    GtkWidget *nb = gtk_notebook_new();
    return (UIHandle)nb;
}

UIHandle ui_tab(UIHandle tv, const char *label, const char *icon) {
    GtkWidget *page = gtk_box_new(GTK_ORIENTATION_VERTICAL, 8);
    GtkWidget *tab_label = gtk_label_new(label);
    gtk_notebook_append_page(GTK_NOTEBOOK(tv), page, tab_label);
    return (UIHandle)page;
}

/* ─── Popover ────────────────────────────────────────────────────── */

void ui_show_popover(UIHandle anchor, UIHandle content, int w, int h) {
    GtkWidget *popover = gtk_popover_new();
    gtk_widget_set_parent(popover, GTK_WIDGET(anchor));
    gtk_widget_set_size_request(popover, w, h);
    gtk_popover_set_child(GTK_POPOVER(popover), GTK_WIDGET(content));
    gtk_popover_popup(GTK_POPOVER(popover));
}

/* ─── Alert ──────────────────────────────────────────────────────── */

void ui_alert(const char *title, const char *msg, const char *btn) {
    /* GtkAlertDialog is GTK 4.10+ — use simple message dialog */
    fprintf(stderr, "[alert] %s: %s\n", title, msg);
}

/* ─── Background / Styling ───────────────────────────────────────── */

void ui_set_background_rgb(UIHandle v, double r, double g, double b, double a) {
    char css[128];
    snprintf(css, sizeof(css), "* { background-color: rgba(%d,%d,%d,%.2f); }",
             (int)(r*255), (int)(g*255), (int)(b*255), a);
    GtkCssProvider *p = gtk_css_provider_new();
    gtk_css_provider_load_from_string(p, css);
    gtk_style_context_add_provider(
        gtk_widget_get_style_context(GTK_WIDGET(v)),
        GTK_STYLE_PROVIDER(p),
        GTK_STYLE_PROVIDER_PRIORITY_APPLICATION + 1
    );
}

void ui_set_background_system(UIHandle v, int c) {
    apply_system_color_css(GTK_WIDGET(v), c, "background-color");
}

void ui_set_corner_radius(UIHandle v, double r) {
    char css[64];
    snprintf(css, sizeof(css), "* { border-radius: %.0fpx; }", r);
    GtkCssProvider *p = gtk_css_provider_new();
    gtk_css_provider_load_from_string(p, css);
    gtk_style_context_add_provider(
        gtk_widget_get_style_context(GTK_WIDGET(v)),
        GTK_STYLE_PROVIDER(p),
        GTK_STYLE_PROVIDER_PRIORITY_APPLICATION + 1
    );
}

void ui_set_border(UIHandle v, double r, double g, double b, double width) {
    char css[128];
    snprintf(css, sizeof(css), "* { border: %.0fpx solid rgba(%d,%d,%d,1); }",
             width, (int)(r*255), (int)(g*255), (int)(b*255));
    GtkCssProvider *p = gtk_css_provider_new();
    gtk_css_provider_load_from_string(p, css);
    gtk_style_context_add_provider(
        gtk_widget_get_style_context(GTK_WIDGET(v)),
        GTK_STYLE_PROVIDER(p),
        GTK_STYLE_PROVIDER_PRIORITY_APPLICATION + 1
    );
}

/* ─── Animation ──────────────────────────────────────────────────── */

void ui_animate(UIHandle v, double duration) {
    /* GTK4 uses property transitions via CSS — placeholder */
}

/* ─── Timer ──────────────────────────────────────────────────────── */

static gboolean on_timer(gpointer user_data) {
    TimerCallbackData *d = (TimerCallbackData *)user_data;
    if (d->fn) d->fn();
    return G_SOURCE_CONTINUE;
}

void ui_set_timer(double interval_sec, UITimerFn fn) {
    TimerCallbackData *d = (TimerCallbackData *)malloc(sizeof(TimerCallbackData));
    d->fn = fn;
    retain(d);
    g_timeout_add((guint)(interval_sec * 1000), on_timer, d);
}

/* ─── Inspector ──────────────────────────────────────────────────── */

#include "runtime/inspector.inc"
