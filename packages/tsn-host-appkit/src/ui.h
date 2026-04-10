/*
 * TSN Native UI Framework — Apple-quality macOS components
 *
 * C API over AppKit. TypeScript devs call functions, get native views.
 * Supports: vibrancy, blur, SF Symbols, dark mode, gradients,
 * split views, outline views, popovers, badges, progress, segmented controls.
 */

#ifndef TSN_UI_H
#define TSN_UI_H

#include <stdbool.h>

typedef struct UIView_ *UIHandle;

/* ─── App & Window ───────────────────────────────────────────────── */
void        ui_init(void);
void        ui_run(UIHandle root);
void        ui_replace_root(UIHandle root);
UIHandle    ui_window(const char *title, int w, int h, bool dark);
void        ui_window_subtitle(UIHandle w, const char *sub);
void        ui_window_toolbar(UIHandle w, bool visible);
void        ui_window_titlebar_transparent(UIHandle w);
void        ui_window_fullsize_content(UIHandle w);

/* ─── Layout ─────────────────────────────────────────────────────── */
UIHandle    ui_vstack(void);
UIHandle    ui_hstack(void);
UIHandle    ui_zstack(void);
UIHandle    ui_view(void);
void        ui_set_clip(UIHandle v, int clip);
void        ui_set_aspect(UIHandle v, int w, int h);
void        ui_set_gradient(UIHandle v, double r1, double g1, double b1, double a1,
                            double r2, double g2, double b2, double a2, int direction);
void        ui_set_padding(UIHandle v, int top, int right, int bottom, int left);
void        ui_set_margin(UIHandle v, int top, int right, int bottom, int left);
void        ui_set_spacing(UIHandle v, int spacing);
void        ui_set_flex(UIHandle v, int flex);
void        ui_set_size(UIHandle v, int w, int h);  /* -1 = auto */
void        ui_set_size_pct(UIHandle v, double w, double h);  /* percentages, -1 = unset */
void        ui_set_min_size(UIHandle v, int w, int h);
void        ui_set_min_size_pct(UIHandle v, double w, double h);
void        ui_set_max_size(UIHandle v, int w, int h);
void        ui_set_max_size_pct(UIHandle v, double w, double h);
void        ui_set_position_type(UIHandle v, int position); /* 0=relative, 1=absolute */
void        ui_set_inset(UIHandle v, int top, int right, int bottom, int left);
void        ui_set_inset_pct(UIHandle v, double top, double right, double bottom, double left);
void        ui_set_alignment(UIHandle v, int align); /* child self-alignment on cross-axis: 0=leading, 1=center, 2=trailing */
void        ui_set_margin_auto(UIHandle v);           /* mx-auto: auto left+right margins for centering */
void        ui_set_align_items(UIHandle v, int align);    /* container cross-axis: 0=start, 1=center, 2=end, 3=stretch */
void        ui_set_justify_content(UIHandle v, int just); /* container main-axis: 0=start, 1=center, 2=end, 3=space-between */
void        ui_add_child(UIHandle parent, UIHandle child);
UIHandle    ui_spacer(void);
UIHandle    ui_divider(void);

/* ─── Visual Effect (vibrancy/blur) ──────────────────────────────── */
/* material: 0=sidebar, 1=header, 2=content, 3=sheet, 4=fullscreen, 5=tooltip, 6=menu, 7=popover, 8=hudWindow */
UIHandle    ui_blur_view(int material);

/* ─── Text ───────────────────────────────────────────────────────── */
UIHandle    ui_text(const char *content, int size, bool bold);
UIHandle    ui_text_mono(const char *content, int size, bool bold);
void        ui_text_set_color_rgb(UIHandle t, double r, double g, double b, double a);
void        ui_text_set_color_system(UIHandle t, int color);
/* system colors: 0=label, 1=secondaryLabel, 2=tertiaryLabel, 3=blue, 4=green,
   5=red, 6=orange, 7=yellow, 8=purple, 9=pink, 10=teal, 11=indigo, 12=cyan */
void        ui_text_set_selectable(UIHandle t, bool sel);
void        ui_text_set_weight(UIHandle t, int weight);      /* 0=thin..4=regular..6=semibold..7=bold..9=black */
void        ui_text_set_line_height(UIHandle t, double mult); /* line height multiplier, e.g. 1.2 */
void        ui_text_set_tracking(UIHandle t, double kern);   /* letter-spacing in points */
void        ui_text_set_transform(UIHandle t, int xform);    /* 0=none, 1=uppercase, 2=lowercase */
void        ui_text_set_align(UIHandle t, int align);        /* 0=left, 1=center, 2=right */
void        ui_text_set_truncate(UIHandle t);                /* single-line with tail truncation */
UIHandle    ui_label(const char *content);  /* small gray secondary text */

/* ─── SF Symbols ─────────────────────────────────────────────────── */
UIHandle    ui_symbol(const char *name, int size);
void        ui_symbol_set_color(UIHandle s, int system_color);

/* ─── Images ─────────────────────────────────────────────────────── */
UIHandle    ui_image(const char *path);
void        ui_image_set_scaling(UIHandle img, int mode); /* 0=contain, 1=cover, 2=fill */

/* ─── Text Field / Search ────────────────────────────────────────── */
UIHandle    ui_text_field(const char *placeholder);
UIHandle    ui_search_field(const char *placeholder);
UIHandle    ui_text_area(const char *placeholder);
UIHandle    ui_select(void);
void        ui_select_add_option(UIHandle select, const char *label);
void        ui_select_set_value(UIHandle select, const char *value);
typedef void (*UITextChangedFn)(const char *text);
void        ui_on_text_changed(UIHandle field, UITextChangedFn fn);
void        ui_on_select_changed(UIHandle select, UITextChangedFn fn);
void        ui_text_input_set_value(UIHandle field, const char *text);
UIHandle    ui_checkbox(const char *label, bool initial);
UIHandle    ui_radio(const char *label, bool initial);
UIHandle    ui_switch(bool initial);
typedef void (*UIBoolChangedFn)(bool on);
void        ui_on_bool_changed(UIHandle control, UIBoolChangedFn fn);
void        ui_bool_control_set_value(UIHandle control, bool on);

/* ─── Buttons ────────────────────────────────────────────────────── */
typedef void (*UIClickFn)(int tag);
UIHandle    ui_button(const char *label, UIClickFn fn, int tag);
UIHandle    ui_button_icon(const char *sf_symbol, const char *label, UIClickFn fn, int tag);
/* style: 0=regular, 1=prominent/accent, 2=destructive, 3=borderless */
void        ui_button_set_style(UIHandle b, int style);
void        ui_on_click(UIHandle v, UIClickFn fn, int tag);

/* ─── Segmented Control ──────────────────────────────────────────── */
UIHandle    ui_segmented(int count, const char **labels);
typedef void (*UISegmentFn)(int selected);
void        ui_segmented_on_change(UIHandle seg, UISegmentFn fn);

/* ─── Toggle / Switch ────────────────────────────────────────────── */
UIHandle    ui_toggle(const char *label, bool initial);
typedef void (*UIToggleFn)(bool on);
void        ui_toggle_on_change(UIHandle tog, UIToggleFn fn);

/* ─── Progress ───────────────────────────────────────────────────── */
UIHandle    ui_progress(double value); /* 0.0 - 1.0, -1 = indeterminate */
void        ui_progress_set(UIHandle p, double value);

/* ─── Badge / Pill ───────────────────────────────────────────────── */
UIHandle    ui_badge(const char *text, int system_color);

/* ─── Card (rounded container with shadow) ───────────────────────── */
UIHandle    ui_card(void);
void        ui_card_set_color(UIHandle c, double r, double g, double b, double a);

/* ─── Stat Card (number + label, like a KPI) ─────────────────────── */
UIHandle    ui_stat(const char *value, const char *label, int system_color);

/* ─── Sidebar List ───────────────────────────────────────────────── */
UIHandle    ui_sidebar(int width);
UIHandle    ui_sidebar_section(UIHandle sidebar, const char *header);
UIHandle    ui_sidebar_item(UIHandle section, const char *label, const char *sf_symbol, int tag, UIClickFn fn);
void        ui_sidebar_item_set_badge(UIHandle item, const char *badge_text);

/* ─── Data Table ─────────────────────────────────────────────────── */
UIHandle    ui_data_table(void);
void        ui_data_table_add_column(UIHandle tbl, const char *id, const char *title, int width);
typedef const char *(*UITableCellFn)(int row, int col, void *ctx);
void        ui_data_table_set_data(UIHandle tbl, int rows, UITableCellFn fn, void *ctx);
void        ui_data_table_set_row_height(UIHandle tbl, int height);
void        ui_data_table_set_alternating(UIHandle tbl, bool alt);

/* ─── Bar Chart ──────────────────────────────────────────────────── */
UIHandle    ui_bar_chart(int height);
void        ui_bar_chart_add(UIHandle chart, const char *label, double value, int system_color);
void        ui_bar_chart_set_title(UIHandle chart, const char *title);

/* ─── Line Sparkline (small inline chart) ────────────────────────── */
UIHandle    ui_sparkline(int width, int height);
void        ui_sparkline_set_values(UIHandle spark, double *values, int count, int system_color);

/* ─── Scroll View ────────────────────────────────────────────────── */
UIHandle    ui_scroll(void);
void        ui_scroll_set_axis(UIHandle s, int axis); /* 0=vertical, 1=horizontal */

/* ─── Tab View ───────────────────────────────────────────────────── */
UIHandle    ui_tab_view(void);
UIHandle    ui_tab(UIHandle tv, const char *label, const char *sf_symbol);

/* ─── Popover ────────────────────────────────────────────────────── */
void        ui_show_popover(UIHandle anchor, UIHandle content, int width, int height);

/* ─── Alert / Dialog ─────────────────────────────────────────────── */
void        ui_alert(const char *title, const char *message, const char *button);

/* ─── Shadow ─────────────────────────────────────────────────────── */
void        ui_set_shadow(UIHandle v, double ox, double oy, double radius, double opacity);

/* ─── Background Color ──────────────────────────────────────────── */
void        ui_set_background_rgb(UIHandle v, double r, double g, double b, double a);
void        ui_set_background_system(UIHandle v, int color);
void        ui_set_corner_radius(UIHandle v, double r);
void        ui_set_border_color(UIHandle v, double r, double g, double b, double a);
void        ui_set_border_width(UIHandle v, double width);

/* ─── Animation ──────────────────────────────────────────────────── */
void        ui_animate(UIHandle v, double duration); /* next property change is animated */

/* ─── Timer / Periodic Update ────────────────────────────────────── */
typedef void (*UITimerFn)(void);
void        ui_set_timer(double interval_sec, UITimerFn fn);

/* ─── Inspector (dev tools) ──────────────────────────────────────── */
void        ui_inspector_start(void);  /* starts Unix socket listener on /tmp/tsn-inspect.sock */
void        ui_set_id(UIHandle v, const char *element_id);  /* register element for inspector lookup */

#endif /* TSN_UI_H */
