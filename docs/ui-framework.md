# Native UI Framework

The native AppKit host (`packages/tsn-host-appkit/src/ui.h` + `ui.m`) wraps macOS AppKit with a C API. TypeScript developers never call these directly — the JSX compiler generates the calls. This reference is for extending the host framework.

## Architecture

```
TypeScript JSX  →  planner / Tailwind lowering  →  ui_*() C calls  →  AppKit views
```

Every `ui_*()` function creates a real NSView subclass. The compile entrypoint is [ui.m](/Users/kumardivyarajat/WebstormProjects/bun-vite/vite/packages/tsn-host-appkit/src/ui.m), but the implementation is now split by responsibility under `packages/tsn-host-appkit/src/runtime/`:

- `windowing.inc` for app/window lifecycle and crash overlay
- `layout.inc` for stacks, spacers, sizing, and blur-wrapper layout behavior
- `controls.inc` for buttons, images, text inputs, and click handlers
- `shell.inc` for sidebars, scroll views, tabs, and shell primitives
- `inspector.inc` for the live inspector and screenshots

## UIHandle

```c
typedef struct UIView_ *UIHandle;
```

Opaque pointer to an NSView. All API functions take and return UIHandle.

## App & Window

```c
void     ui_init(void);                                    // Initialize NSApplication
void     ui_run(UIHandle root);                            // Show window, start event loop
UIHandle ui_window(const char *title, int w, int h, bool dark);
void     ui_window_subtitle(UIHandle w, const char *sub);
void     ui_window_toolbar(UIHandle w, bool visible);
void     ui_window_titlebar_transparent(UIHandle w);
void     ui_window_fullsize_content(UIHandle w);
```

## Layout

```c
UIHandle ui_vstack(void);                                  // Vertical stack (flexbox column)
UIHandle ui_hstack(void);                                  // Horizontal stack (flexbox row)
UIHandle ui_zstack(void);                                  // Overlay stack
UIHandle ui_view(void);                                    // Neutral generic box
void     ui_set_clip(UIHandle v, int clip);
void     ui_set_aspect(UIHandle v, int w, int h);
void     ui_set_gradient(UIHandle v, double r1, double g1, double b1, double a1,
                         double r2, double g2, double b2, double a2, int direction);
void     ui_set_padding(UIHandle v, int t, int r, int b, int l);
void     ui_set_margin(UIHandle v, int t, int r, int b, int l);
void     ui_set_spacing(UIHandle v, int spacing);          // Gap between children
void     ui_set_flex(UIHandle v, int flex);                // Flex grow factor
void     ui_set_size(UIHandle v, int w, int h);            // -1 = auto
void     ui_set_size_pct(UIHandle v, double w, double h);
void     ui_set_min_size(UIHandle v, int w, int h);
void     ui_set_min_size_pct(UIHandle v, double w, double h);
void     ui_set_max_size(UIHandle v, int w, int h);
void     ui_set_max_size_pct(UIHandle v, double w, double h);
void     ui_set_position_type(UIHandle v, int position);   // 0=relative, 1=absolute
void     ui_set_inset(UIHandle v, int top, int right, int bottom, int left);
void     ui_set_inset_pct(UIHandle v, double top, double right, double bottom, double left);
void     ui_set_alignment(UIHandle v, int align);          // child self-alignment on cross-axis
void     ui_set_margin_auto(UIHandle v);
void     ui_set_align_items(UIHandle v, int align);
void     ui_set_justify_content(UIHandle v, int just);
void     ui_add_child(UIHandle parent, UIHandle child);
UIHandle ui_spacer(void);                                  // Flexible space filler
UIHandle ui_divider(void);                                 // Horizontal line
```

### UIStackContainer (internal)

The layout engine. Properties:
- `direction`: 0 = vertical, 1 = horizontal
- `flex`: grow factor (0 = fixed size)
- `fixed_width`, `fixed_height`: explicit dimensions
- `min_width/min_height`, `max_width/max_height`: constraints used to clamp the resolved frame
- `alignment`: cross-axis child alignment (`leading`, `center`, `trailing`)
- `padding_top/right/bottom/left`, `spacing`
- `children`: NSMutableArray of child views

Layout algorithm:
1. First pass: count fixed/flexible children, compute total fixed space
2. Second pass: distribute remaining space among flex children
3. Non-flex children use `naturalSize` (recursively computed content size)
4. Child frames are clamped by min/max constraints and can be centered on the cross-axis

## Text & Labels

```c
UIHandle ui_text(const char *content, int size, bool bold);
UIHandle ui_text_mono(const char *content, int size, bool bold);
void     ui_text_set_color_rgb(UIHandle t, double r, double g, double b, double a);
void     ui_text_set_color_system(UIHandle t, int color);
void     ui_text_set_selectable(UIHandle t, bool sel);
void     ui_text_set_weight(UIHandle t, int weight);
void     ui_text_set_line_height(UIHandle t, double mult);
void     ui_text_set_tracking(UIHandle t, double kern);
void     ui_text_set_transform(UIHandle t, int xform);
void     ui_text_set_align(UIHandle t, int align);
void     ui_text_set_truncate(UIHandle t);
UIHandle ui_label(const char *content);
```

## SF Symbols

```c
UIHandle ui_symbol(const char *name, int size);            // e.g. "chart.bar.fill"
void     ui_symbol_set_color(UIHandle s, int system_color);
```

## Input Fields

```c
UIHandle ui_text_field(const char *placeholder);
UIHandle ui_search_field(const char *placeholder);
UIHandle ui_text_area(const char *placeholder);
UIHandle ui_select(void);
void     ui_select_add_option(UIHandle select, const char *label);
void     ui_select_set_value(UIHandle select, const char *value);

typedef void (*UITextChangedFn)(const char *text);
void     ui_on_text_changed(UIHandle field, UITextChangedFn fn);
void     ui_on_select_changed(UIHandle select, UITextChangedFn fn);
void     ui_text_input_set_value(UIHandle field, const char *text);
UIHandle ui_checkbox(const char *label, bool initial);
UIHandle ui_radio(const char *label, bool initial);
UIHandle ui_switch(bool initial);
typedef void (*UIBoolChangedFn)(bool on);
void     ui_on_bool_changed(UIHandle control, UIBoolChangedFn fn);
void     ui_bool_control_set_value(UIHandle control, bool on);
```

`ui_text_input_set_value()` is what controlled `Search`, `Input`, and `TextArea` values use during rerenders and reset flows.

## Buttons

```c
typedef void (*UIClickFn)(int tag);
UIHandle ui_button(const char *label, UIClickFn fn, int tag);
UIHandle ui_button_icon(const char *sf_symbol, const char *label, UIClickFn fn, int tag);
void     ui_button_set_style(UIHandle b, int style);       // 0=regular 1=prominent 2=destructive 3=borderless 4=ghost 5=secondary 6=outline 7=link
void     ui_on_click(UIHandle v, UIClickFn fn, int tag);
```

## Sidebar

```c
UIHandle ui_sidebar(int width);
UIHandle ui_sidebar_section(UIHandle sidebar, const char *header);
UIHandle ui_sidebar_item(UIHandle section, const char *label,
                         const char *sf_symbol, int tag, UIClickFn fn);
void     ui_sidebar_item_set_badge(UIHandle item, const char *badge_text);
```

## Data Table

```c
UIHandle ui_data_table(void);
void     ui_data_table_add_column(UIHandle tbl, const char *id, const char *title, int width);

typedef const char *(*UITableCellFn)(int row, int col, void *ctx);
void     ui_data_table_set_data(UIHandle tbl, int rows, UITableCellFn fn, void *ctx);
void     ui_data_table_set_row_height(UIHandle tbl, int height);
void     ui_data_table_set_alternating(UIHandle tbl, bool alt);
```

## Cards & Statistics

```c
UIHandle ui_card(void);
void     ui_card_set_color(UIHandle c, double r, double g, double b, double a);
UIHandle ui_stat(const char *value, const char *label, int system_color);
UIHandle ui_badge(const char *text, int system_color);
```

## Charts

```c
UIHandle ui_bar_chart(int height);
void     ui_bar_chart_add(UIHandle chart, const char *label, double value, int system_color);
void     ui_bar_chart_set_title(UIHandle chart, const char *title);
UIHandle ui_sparkline(int width, int height);
void     ui_sparkline_set_values(UIHandle spark, double *values, int count, int system_color);
```

## Containers & Effects

```c
UIHandle ui_blur_view(int material);    // 0=sidebar 1=header 2=content ...
UIHandle ui_scroll(void);
void     ui_scroll_set_axis(UIHandle s, int axis); // 0=vertical 1=horizontal
UIHandle ui_tab_view(void);
UIHandle ui_tab(UIHandle tv, const char *label, const char *sf_symbol);
```

## Visual Styling

```c
void ui_set_background_rgb(UIHandle v, double r, double g, double b, double a);
void ui_set_background_system(UIHandle v, int color);
void ui_set_corner_radius(UIHandle v, double r);
void ui_set_border_color(UIHandle v, double r, double g, double b, double a);
void ui_set_border_width(UIHandle v, double width);
void ui_set_shadow(UIHandle v, double ox, double oy, double radius, double opacity);
void ui_animate(UIHandle v, double duration);
```

## Miscellaneous

```c
void ui_show_popover(UIHandle anchor, UIHandle content, int width, int height);
void ui_alert(const char *title, const char *message, const char *button);
UIHandle ui_progress(double value);              // 0-1 or -1 for indeterminate
UIHandle ui_toggle(const char *label, bool initial);
void     ui_toggle_on_change(UIHandle tog, UIToggleFn fn);
UIHandle ui_segmented(int count, const char **labels);
void     ui_segmented_on_change(UIHandle seg, UISegmentFn fn);

typedef void (*UITimerFn)(void);
void ui_set_timer(double interval_sec, UITimerFn fn);
```

## Inspector & Debug

```c
void ui_inspector_start(void);                    // Start Unix socket listener
void ui_set_id(UIHandle v, const char *element_id); // Register element for inspector lookup
```

The inspector now uses per-app sockets when needed. A single running app can still be auto-discovered, but concurrent apps are addressed with `--app <binary-name>` from [compiler/inspect.ts](/Users/kumardivyarajat/WebstormProjects/bun-vite/vite/compiler/inspect.ts).

## System Color Indices

Used in `ui_stat`, `ui_badge`, `ui_text_set_color_system`, etc:

| Index | Color |
|-------|-------|
| 0 | label (primary text) |
| 1 | secondaryLabel |
| 2 | tertiaryLabel |
| 3 | systemBlue |
| 4 | systemGreen |
| 5 | systemRed |
| 6 | systemOrange |
| 7 | systemYellow |
| 8 | systemPurple |
| 9 | systemPink |
| 10 | systemTeal |
| 11 | systemIndigo |
| 12 | systemCyan |
