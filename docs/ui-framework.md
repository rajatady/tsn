# Native UI Framework

The native AppKit host (`packages/tsn-host-appkit/src/ui.h` + `ui.m`) wraps macOS AppKit with a C API. TypeScript developers never call these directly — the JSX compiler generates the calls. This reference is for extending the host framework.

## Architecture

```
TypeScript JSX  →  codegen (jsx.ts)  →  ui_*() C calls  →  AppKit views
```

Every `ui_*()` function creates a real NSView subclass. Views are retained in `g_retained` (NSMutableArray) to prevent ARC from releasing them.

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
void     ui_set_padding(UIHandle v, int t, int r, int b, int l);
void     ui_set_spacing(UIHandle v, int spacing);          // Gap between children
void     ui_set_flex(UIHandle v, int flex);                // Flex grow factor
void     ui_set_size(UIHandle v, int w, int h);            // -1 = auto
void     ui_set_min_size(UIHandle v, int w, int h);
void     ui_set_max_size(UIHandle v, int w, int h);
void     ui_set_alignment(UIHandle v, int align);          // child self-alignment on cross-axis
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
UIHandle ui_label(const char *content);
void     ui_text_set_color_rgb(UIHandle t, double r, double g, double b, double a);
void     ui_text_set_color_system(UIHandle t, int color);
void     ui_text_set_selectable(UIHandle t, bool sel);
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

typedef void (*UITextChangedFn)(const char *text);
void     ui_on_text_changed(UIHandle field, UITextChangedFn fn);
```

## Buttons

```c
typedef void (*UIClickFn)(int tag);
UIHandle ui_button(const char *label, UIClickFn fn, int tag);
UIHandle ui_button_icon(const char *sf_symbol, const char *label, UIClickFn fn, int tag);
void     ui_button_set_style(UIHandle b, int style);       // 0=regular 1=prominent 2=destructive 3=borderless
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
void ui_set_border(UIHandle v, double r, double g, double b, double width);
void ui_animate(UIHandle v, double duration);
```

## Miscellaneous

```c
void ui_show_popover(UIHandle anchor, UIHandle content, int width, int height);
void ui_alert(const char *title, const char *message, const char *button);
UIHandle ui_progress(double value);              // 0-1 or -1 for indeterminate
UIHandle ui_toggle(bool initial, UIToggleFn fn);
UIHandle ui_segmented(const char **labels, int count, UISegmentFn fn);

typedef void (*UITimerFn)(void);
void ui_set_timer(double interval_sec, UITimerFn fn);
```

## Inspector & Debug

```c
void ui_inspector_start(void);                    // Start Unix socket listener
void ui_set_id(UIHandle v, const char *element_id); // Register element for inspector lookup
```

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
