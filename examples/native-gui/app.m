/*
 * Native macOS Dashboard — powered by TypeScript compiled to native code.
 *
 * No Electron. No WebView. No JS runtime. No React. No HTML/CSS.
 * Pure AppKit + Core Graphics + compiled TypeScript.
 *
 * The data processing (CSV parsing, fuzzy search, aggregation)
 * is done by functions compiled from TypeScript → C → native.
 * The UI is native macOS with vibrancy, blur, SF Symbols, dark mode.
 *
 * Build:
 *   clang -O2 -fobjc-arc -framework Cocoa -framework QuartzCore \
 *     -o build/dashboard app.m ../../build/fuzzy_score.c \
 *     -Icompiler/runtime -lm
 */

#import <Cocoa/Cocoa.h>
#import <QuartzCore/QuartzCore.h>
#include "../../compiler/runtime/runtime.h"

/* ─── TypeScript-compiled functions ──────────────────────────────── */
extern double fuzzyScore(Str text, Str query);

/* ─── Data Model ─────────────────────────────────────────────────── */

typedef struct {
    char name[64];
    int age;
    char city[32];
    double score;
} Person;

static Person *g_data = NULL;
static int g_data_len = 0;
static int *g_filtered_indices = NULL;
static int g_filtered_len = 0;

/* City stats */
typedef struct { char city[32]; int count; double avg_score; double total; } CityInfo;
static CityInfo g_cities[20];
static int g_ncities = 0;

/* ─── Data Generation (same seed as our CSV) ─────────────────────── */

static int seed_state = 42;
static double seeded_rand(void) {
    seed_state = (seed_state * 1103515245 + 12345) & 0x7fffffff;
    return (double)seed_state / 0x7fffffff;
}

static void generate_data(int n) {
    const char *firsts[] = {"Alice","Bob","Charlie","Diana","Eve","Frank","Grace","Hank","Ivy","Jack"};
    const char *lasts[] = {"Smith","Jones","Brown","Davis","Wilson","Moore","Taylor","Clark","Hall","Lee"};
    const char *cities[] = {"New York","London","Tokyo","Berlin","Sydney","Paris","Toronto","Mumbai"};

    g_data = (Person *)malloc(n * sizeof(Person));
    g_filtered_indices = (int *)malloc(n * sizeof(int));

    for (int i = 0; i < n; i++) {
        int fi = (int)(seeded_rand() * 9.999); if (fi > 9) fi = 9;
        int li = (int)(seeded_rand() * 9.999); if (li > 9) li = 9;
        int ci = (int)(seeded_rand() * 7.999); if (ci > 7) ci = 7;
        snprintf(g_data[i].name, 64, "%s %s", firsts[fi], lasts[li]);
        g_data[i].age = 18 + (int)(seeded_rand() * 49.999);
        snprintf(g_data[i].city, 32, "%s", cities[ci]);
        g_data[i].score = ((int)(seeded_rand() * 9999)) / 100.0;
    }
    g_data_len = n;

    /* Compute city stats */
    for (int i = 0; i < n; i++) {
        int found = -1;
        for (int j = 0; j < g_ncities; j++) {
            if (strcmp(g_cities[j].city, g_data[i].city) == 0) { found = j; break; }
        }
        if (found == -1) {
            found = g_ncities++;
            strcpy(g_cities[found].city, g_data[i].city);
            g_cities[found].count = 0;
            g_cities[found].total = 0;
        }
        g_cities[found].count++;
        g_cities[found].total += g_data[i].score;
    }
    for (int i = 0; i < g_ncities; i++) {
        g_cities[i].avg_score = g_cities[i].total / g_cities[i].count;
    }

    /* Initial filter: all rows */
    g_filtered_len = n;
    for (int i = 0; i < n; i++) g_filtered_indices[i] = i;
}

/* ─── Filter/Search using compiled TypeScript ────────────────────── */

static char g_search_query[256] = "";
static char g_city_filter[32] = "";

static void apply_filters(void) {
    g_filtered_len = 0;
    Str query = { g_search_query, NULL, (int)strlen(g_search_query), 0 };

    for (int i = 0; i < g_data_len; i++) {
        /* City filter */
        if (g_city_filter[0] && strcmp(g_data[i].city, g_city_filter) != 0) continue;

        /* Fuzzy search filter (uses TypeScript-compiled function!) */
        if (query.len > 0) {
            Str name = { g_data[i].name, NULL, (int)strlen(g_data[i].name), 0 };
            double score = fuzzyScore(name, query);
            if (score <= 0) continue;
        }

        g_filtered_indices[g_filtered_len++] = i;
    }
}

/* ─── Chart View (Core Graphics) ─────────────────────────────────── */

@interface ChartView : NSView
@end

@implementation ChartView

- (BOOL)isFlipped { return YES; }

- (void)drawRect:(NSRect)dirtyRect {
    [super drawRect:dirtyRect];
    NSRect bounds = self.bounds;

    /* Background */
    [[NSColor colorWithWhite:0.12 alpha:1.0] setFill];
    NSRectFill(bounds);

    if (g_ncities == 0) return;

    /* Find max for scaling */
    double maxAvg = 0;
    for (int i = 0; i < g_ncities; i++) {
        if (g_cities[i].avg_score > maxAvg) maxAvg = g_cities[i].avg_score;
    }
    if (maxAvg == 0) maxAvg = 1;

    CGFloat padding = 20;
    CGFloat barWidth = (bounds.size.width - padding * 2) / g_ncities - 8;
    CGFloat chartHeight = bounds.size.height - 70;

    /* Title */
    NSDictionary *titleAttrs = @{
        NSFontAttributeName: [NSFont systemFontOfSize:13 weight:NSFontWeightSemibold],
        NSForegroundColorAttributeName: [NSColor colorWithWhite:0.9 alpha:1.0]
    };
    [@"Average Score by City" drawAtPoint:NSMakePoint(padding, 8) withAttributes:titleAttrs];

    /* Bars */
    NSArray *colors = @[
        [NSColor systemBlueColor], [NSColor systemPurpleColor],
        [NSColor systemPinkColor], [NSColor systemOrangeColor],
        [NSColor systemYellowColor], [NSColor systemGreenColor],
        [NSColor systemTealColor], [NSColor systemIndigoColor],
    ];

    NSDictionary *labelAttrs = @{
        NSFontAttributeName: [NSFont systemFontOfSize:9 weight:NSFontWeightMedium],
        NSForegroundColorAttributeName: [NSColor colorWithWhite:0.7 alpha:1.0]
    };
    NSDictionary *valAttrs = @{
        NSFontAttributeName: [NSFont monospacedDigitSystemFontOfSize:11 weight:NSFontWeightBold],
        NSForegroundColorAttributeName: [NSColor colorWithWhite:0.95 alpha:1.0]
    };

    for (int i = 0; i < g_ncities; i++) {
        CGFloat x = padding + i * (barWidth + 8);
        CGFloat barH = (g_cities[i].avg_score / maxAvg) * chartHeight * 0.85;
        CGFloat y = bounds.size.height - 30 - barH;

        /* Bar with gradient feel */
        NSColor *color = colors[i % colors.count];
        [[color colorWithAlphaComponent:0.85] setFill];

        NSBezierPath *bar = [NSBezierPath bezierPathWithRoundedRect:NSMakeRect(x, y, barWidth, barH)
                                                            xRadius:4 yRadius:4];
        [bar fill];

        /* Glow effect */
        [[color colorWithAlphaComponent:0.15] setFill];
        NSRectFill(NSMakeRect(x, y - 2, barWidth, barH + 4));

        /* City label */
        NSString *cityName = [NSString stringWithUTF8String:g_cities[i].city];
        NSSize labelSize = [cityName sizeWithAttributes:labelAttrs];
        [cityName drawAtPoint:NSMakePoint(x + (barWidth - labelSize.width) / 2, bounds.size.height - 18)
               withAttributes:labelAttrs];

        /* Value label */
        NSString *val = [NSString stringWithFormat:@"%.0f", g_cities[i].avg_score];
        NSSize valSize = [val sizeWithAttributes:valAttrs];
        [val drawAtPoint:NSMakePoint(x + (barWidth - valSize.width) / 2, y - 18)
          withAttributes:valAttrs];
    }
}

@end

/* ─── Table Data Source ──────────────────────────────────────────── */

@interface TableDelegate : NSObject <NSTableViewDataSource, NSTableViewDelegate>
@property (nonatomic, strong) NSTableView *tableView;
@end

@implementation TableDelegate

- (NSInteger)numberOfRowsInTableView:(NSTableView *)tv {
    return g_filtered_len > 200 ? 200 : g_filtered_len; /* cap for performance */
}

- (NSView *)tableView:(NSTableView *)tv viewForTableColumn:(NSTableColumn *)col row:(NSInteger)row {
    NSString *ident = col.identifier;
    NSTextField *cell = [tv makeViewWithIdentifier:ident owner:self];
    if (!cell) {
        cell = [NSTextField labelWithString:@""];
        cell.identifier = ident;
        cell.font = [NSFont monospacedDigitSystemFontOfSize:12 weight:NSFontWeightRegular];
        cell.textColor = [NSColor colorWithWhite:0.85 alpha:1.0];
        cell.drawsBackground = NO;
    }

    int idx = g_filtered_indices[row];
    Person *p = &g_data[idx];

    if ([ident isEqualToString:@"rank"]) {
        cell.stringValue = [NSString stringWithFormat:@"%ld", row + 1];
        cell.textColor = [NSColor colorWithWhite:0.5 alpha:1.0];
    } else if ([ident isEqualToString:@"name"]) {
        cell.stringValue = [NSString stringWithUTF8String:p->name];
        cell.font = [NSFont systemFontOfSize:12 weight:NSFontWeightMedium];
    } else if ([ident isEqualToString:@"age"]) {
        cell.stringValue = [NSString stringWithFormat:@"%d", p->age];
    } else if ([ident isEqualToString:@"city"]) {
        cell.stringValue = [NSString stringWithUTF8String:p->city];
        cell.textColor = [NSColor systemTealColor];
    } else if ([ident isEqualToString:@"score"]) {
        cell.stringValue = [NSString stringWithFormat:@"%.1f", p->score];
        /* Color code by score */
        if (p->score >= 80) cell.textColor = [NSColor systemGreenColor];
        else if (p->score >= 50) cell.textColor = [NSColor systemYellowColor];
        else cell.textColor = [NSColor systemOrangeColor];
        cell.font = [NSFont monospacedDigitSystemFontOfSize:12 weight:NSFontWeightBold];
    }

    return cell;
}

@end

/* ─── App Delegate ───────────────────────────────────────────────── */

@interface AppDelegate : NSObject <NSApplicationDelegate, NSSearchFieldDelegate>
@property (nonatomic, strong) NSWindow *window;
@property (nonatomic, strong) TableDelegate *tableDelegate;
@property (nonatomic, strong) NSTableView *tableView;
@property (nonatomic, strong) ChartView *chartView;
@property (nonatomic, strong) NSTextField *statusLabel;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)n {
    /* Generate data */
    generate_data(100000);

    /* Window */
    NSRect frame = NSMakeRect(200, 100, 1100, 720);
    self.window = [[NSWindow alloc] initWithContentRect:frame
        styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable |
                  NSWindowStyleMaskResizable | NSWindowStyleMaskMiniaturizable |
                  NSWindowStyleMaskFullSizeContentView
        backing:NSBackingStoreBuffered defer:NO];
    self.window.title = @"TSN Dashboard — 100K Records (Native Binary, No Runtime)";
    self.window.titlebarAppearsTransparent = YES;
    self.window.backgroundColor = [NSColor colorWithWhite:0.08 alpha:1.0];
    self.window.appearance = [NSAppearance appearanceNamed:NSAppearanceNameDarkAqua];
    self.window.minSize = NSMakeSize(800, 500);

    /* Main container */
    NSView *content = self.window.contentView;

    /* ─── Top bar: title + search ─────────────────────────────── */
    NSVisualEffectView *topBar = [[NSVisualEffectView alloc] initWithFrame:NSMakeRect(0, frame.size.height - 80, frame.size.width, 80)];
    topBar.material = NSVisualEffectMaterialHeaderView;
    topBar.blendingMode = NSVisualEffectBlendingModeBehindWindow;
    topBar.autoresizingMask = NSViewWidthSizable | NSViewMinYMargin;
    [content addSubview:topBar];

    NSTextField *title = [NSTextField labelWithString:@"People Analytics"];
    title.font = [NSFont systemFontOfSize:22 weight:NSFontWeightBold];
    title.textColor = [NSColor colorWithWhite:0.95 alpha:1.0];
    title.frame = NSMakeRect(20, 25, 250, 30);
    [topBar addSubview:title];

    NSTextField *subtitle = [NSTextField labelWithString:@"Powered by TypeScript \u2192 Native (no runtime, 34 KB binary)"];
    subtitle.font = [NSFont systemFontOfSize:11 weight:NSFontWeightRegular];
    subtitle.textColor = [NSColor colorWithWhite:0.5 alpha:1.0];
    subtitle.frame = NSMakeRect(20, 8, 400, 16);
    [topBar addSubview:subtitle];

    /* Search field */
    NSSearchField *search = [[NSSearchField alloc] initWithFrame:NSMakeRect(frame.size.width - 320, 25, 300, 28)];
    search.placeholderString = @"Fuzzy search (TypeScript-compiled)...";
    search.autoresizingMask = NSViewMinXMargin;
    search.delegate = self;
    search.appearance = [NSAppearance appearanceNamed:NSAppearanceNameDarkAqua];
    [topBar addSubview:search];

    /* ─── Sidebar: city filters ───────────────────────────────── */
    NSVisualEffectView *sidebar = [[NSVisualEffectView alloc] initWithFrame:NSMakeRect(0, 0, 180, frame.size.height - 80)];
    sidebar.material = NSVisualEffectMaterialSidebar;
    sidebar.blendingMode = NSVisualEffectBlendingModeBehindWindow;
    sidebar.autoresizingMask = NSViewHeightSizable;
    [content addSubview:sidebar];

    NSTextField *sideTitle = [NSTextField labelWithString:@"CITIES"];
    sideTitle.font = [NSFont systemFontOfSize:10 weight:NSFontWeightBold];
    sideTitle.textColor = [NSColor colorWithWhite:0.5 alpha:1.0];
    sideTitle.frame = NSMakeRect(16, frame.size.height - 110, 150, 16);
    sideTitle.autoresizingMask = NSViewMinYMargin;
    [sidebar addSubview:sideTitle];

    /* "All" button */
    NSButton *allBtn = [NSButton buttonWithTitle:@"All Records" target:self action:@selector(filterAll:)];
    allBtn.frame = NSMakeRect(8, frame.size.height - 140, 164, 28);
    allBtn.autoresizingMask = NSViewMinYMargin;
    allBtn.bezelStyle = NSBezelStyleRecessed;
    [sidebar addSubview:allBtn];

    /* City buttons */
    for (int i = 0; i < g_ncities; i++) {
        NSString *label = [NSString stringWithFormat:@"%s (%d)", g_cities[i].city, g_cities[i].count];
        NSButton *btn = [NSButton buttonWithTitle:label target:self action:@selector(filterCity:)];
        btn.frame = NSMakeRect(8, frame.size.height - 172 - i * 30, 164, 26);
        btn.autoresizingMask = NSViewMinYMargin;
        btn.bezelStyle = NSBezelStyleRecessed;
        btn.tag = i;
        [sidebar addSubview:btn];
    }

    /* ─── Chart ───────────────────────────────────────────────── */
    self.chartView = [[ChartView alloc] initWithFrame:NSMakeRect(180, frame.size.height - 280, frame.size.width - 180, 200)];
    self.chartView.autoresizingMask = NSViewWidthSizable | NSViewMinYMargin;
    [content addSubview:self.chartView];

    /* ─── Table ───────────────────────────────────────────────── */
    NSScrollView *scroll = [[NSScrollView alloc] initWithFrame:NSMakeRect(180, 40, frame.size.width - 180, frame.size.height - 320)];
    scroll.hasVerticalScroller = YES;
    scroll.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    scroll.drawsBackground = NO;
    scroll.backgroundColor = [NSColor clearColor];

    self.tableView = [[NSTableView alloc] initWithFrame:scroll.bounds];
    self.tableView.backgroundColor = [NSColor clearColor];
    self.tableView.headerView.frame = NSMakeRect(0, 0, 0, 24);
    self.tableView.rowHeight = 26;
    self.tableView.gridStyleMask = NSTableViewSolidHorizontalGridLineMask;
    self.tableView.gridColor = [NSColor colorWithWhite:0.2 alpha:1.0];
    self.tableView.intercellSpacing = NSMakeSize(8, 4);

    struct { const char *id; const char *title; CGFloat width; } cols[] = {
        {"rank", "#", 35}, {"name", "Name", 180}, {"age", "Age", 50},
        {"city", "City", 120}, {"score", "Score", 80}
    };
    for (int i = 0; i < 5; i++) {
        NSTableColumn *col = [[NSTableColumn alloc] initWithIdentifier:
            [NSString stringWithUTF8String:cols[i].id]];
        col.title = [NSString stringWithUTF8String:cols[i].title];
        col.width = cols[i].width;
        col.headerCell.textColor = [NSColor colorWithWhite:0.6 alpha:1.0];
        [self.tableView addTableColumn:col];
    }

    self.tableDelegate = [[TableDelegate alloc] init];
    self.tableDelegate.tableView = self.tableView;
    self.tableView.dataSource = self.tableDelegate;
    self.tableView.delegate = self.tableDelegate;

    scroll.documentView = self.tableView;
    [content addSubview:scroll];

    /* ─── Status bar ──────────────────────────────────────────── */
    self.statusLabel = [NSTextField labelWithString:@""];
    self.statusLabel.frame = NSMakeRect(190, 10, frame.size.width - 200, 20);
    self.statusLabel.font = [NSFont monospacedDigitSystemFontOfSize:11 weight:NSFontWeightMedium];
    self.statusLabel.textColor = [NSColor colorWithWhite:0.5 alpha:1.0];
    self.statusLabel.autoresizingMask = NSViewWidthSizable;
    [content addSubview:self.statusLabel];

    [self updateStatus];
    [self.window makeKeyAndOrderFront:nil];
}

- (void)updateStatus {
    self.statusLabel.stringValue = [NSString stringWithFormat:
        @"Showing %d of %d records  |  %d cities  |  Search: %s",
        g_filtered_len, g_data_len, g_ncities,
        g_search_query[0] ? g_search_query : "(none)"];
    [self.tableView reloadData];
}

/* Search field delegate — fuzzy search using compiled TypeScript */
- (void)controlTextDidChange:(NSNotification *)n {
    NSSearchField *field = n.object;
    strncpy(g_search_query, field.stringValue.UTF8String, 255);
    apply_filters();
    [self updateStatus];
}

- (void)filterAll:(id)sender {
    g_city_filter[0] = '\0';
    apply_filters();
    [self updateStatus];
}

- (void)filterCity:(NSButton *)sender {
    strcpy(g_city_filter, g_cities[sender.tag].city);
    apply_filters();
    [self updateStatus];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)app { return YES; }

@end

/* ─── Main ───────────────────────────────────────────────────────── */

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        NSApplication *app = [NSApplication sharedApplication];
        app.activationPolicy = NSApplicationActivationPolicyRegular;

        /* Create menu bar */
        NSMenu *menuBar = [[NSMenu alloc] init];
        NSMenuItem *appItem = [[NSMenuItem alloc] init];
        [menuBar addItem:appItem];
        NSMenu *appMenu = [[NSMenu alloc] init];
        [appMenu addItemWithTitle:@"Quit" action:@selector(terminate:) keyEquivalent:@"q"];
        appItem.submenu = appMenu;
        app.mainMenu = menuBar;

        AppDelegate *delegate = [[AppDelegate alloc] init];
        app.delegate = delegate;

        [app activateIgnoringOtherApps:YES];
        [app run];
    }
    return 0;
}
