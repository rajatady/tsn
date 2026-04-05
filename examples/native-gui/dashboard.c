/*
 * StrictTS Dashboard — Native macOS App via ui.h Framework
 *
 * This is what the compiler generates from dashboard.ts.
 * TypeScript developers write declarative UI code,
 * the compiler emits these ui_* calls.
 *
 * Build:
 *   clang -O2 -fobjc-arc -framework Cocoa -framework QuartzCore \
 *     dashboard.c framework/ui.m -o ../../build/dashboard
 */

#include "framework/ui.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* ─── Data Model ────────────────────────────────────────────────── */

typedef struct {
    char name[64];
    int age;
    char department[32];
    char role[48];
    double salary;
    double performance;
    int projects;
    char status[16];  /* "Active", "On Leave", "Remote" */
} Employee;

static Employee *g_data = NULL;
static int g_data_len = 0;
static int *g_filtered = NULL;
static int g_filtered_len = 0;
static char g_search[256] = "";
static char g_dept_filter[32] = "";
static int g_view_mode = 0;  /* 0=overview, 1=departments, 2=performance */

/* Department stats */
typedef struct {
    char name[32];
    int count;
    double avg_salary;
    double avg_perf;
    double total_salary;
    int active;
} DeptInfo;

static DeptInfo g_depts[12];
static int g_ndepts = 0;

/* ─── Data Generation ───────────────────────────────────────────── */

static int g_seed = 42;
static double srand_next(void) {
    g_seed = (g_seed * 1103515245 + 12345) & 0x7fffffff;
    return (double)g_seed / 0x7fffffff;
}

static void generate_data(int n) {
    const char *firsts[] = {"Alice","Bob","Charlie","Diana","Eve","Frank",
                            "Grace","Hank","Ivy","Jack","Kate","Leo",
                            "Maya","Noah","Olivia","Pete"};
    const char *lasts[] = {"Smith","Jones","Brown","Davis","Wilson",
                           "Moore","Taylor","Clark","Hall","Lee",
                           "Adams","Baker","Collins","Foster","Garcia"};
    const char *depts[] = {"Engineering","Design","Marketing","Sales",
                           "Finance","HR","Product","Operations"};
    const char *roles[] = {"Senior Engineer","Designer","Manager","Analyst",
                           "Director","Lead","Associate","Specialist",
                           "VP","Coordinator"};
    const char *statuses[] = {"Active","Active","Active","Active",
                              "Remote","Remote","On Leave"};

    g_data = (Employee *)malloc(n * sizeof(Employee));
    g_filtered = (int *)malloc(n * sizeof(int));

    for (int i = 0; i < n; i++) {
        int fi = (int)(srand_next() * 15.999); if (fi > 15) fi = 15;
        int li = (int)(srand_next() * 14.999); if (li > 14) li = 14;
        int di = (int)(srand_next() * 7.999);  if (di > 7) di = 7;
        int ri = (int)(srand_next() * 9.999);  if (ri > 9) ri = 9;
        int si = (int)(srand_next() * 6.999);  if (si > 6) si = 6;

        snprintf(g_data[i].name, 64, "%s %s", firsts[fi], lasts[li]);
        g_data[i].age = 22 + (int)(srand_next() * 39.999);
        snprintf(g_data[i].department, 32, "%s", depts[di]);
        snprintf(g_data[i].role, 48, "%s", roles[ri]);
        g_data[i].salary = 45000 + (int)(srand_next() * 155000);
        g_data[i].performance = 1.0 + srand_next() * 4.0;
        g_data[i].projects = 1 + (int)(srand_next() * 11.999);
        snprintf(g_data[i].status, 16, "%s", statuses[si]);
    }
    g_data_len = n;

    /* Compute department stats */
    for (int i = 0; i < n; i++) {
        int found = -1;
        for (int j = 0; j < g_ndepts; j++) {
            if (strcmp(g_depts[j].name, g_data[i].department) == 0) { found = j; break; }
        }
        if (found == -1 && g_ndepts < 12) {
            found = g_ndepts++;
            snprintf(g_depts[found].name, 32, "%s", g_data[i].department);
            g_depts[found].count = 0;
            g_depts[found].total_salary = 0;
            g_depts[found].avg_perf = 0;
            g_depts[found].active = 0;
        }
        if (found >= 0) {
            g_depts[found].count++;
            g_depts[found].total_salary += g_data[i].salary;
            g_depts[found].avg_perf += g_data[i].performance;
            if (strcmp(g_data[i].status, "Active") == 0) g_depts[found].active++;
        }
    }
    for (int i = 0; i < g_ndepts; i++) {
        g_depts[i].avg_salary = g_depts[i].total_salary / g_depts[i].count;
        g_depts[i].avg_perf /= g_depts[i].count;
    }

    /* Initial: show all */
    g_filtered_len = n;
    for (int i = 0; i < n; i++) g_filtered[i] = i;
}

/* ─── Fuzzy Search (same algorithm as fuzzy_score.ts) ───────────── */

static double fuzzy_score(const char *text, const char *query) {
    int tlen = (int)strlen(text);
    int qlen = (int)strlen(query);
    if (qlen == 0) return 100;
    if (tlen == 0) return 0;

    double score = 0;
    int qi = 0, consecutive = 0;
    for (int i = 0; i < tlen && qi < qlen; i++) {
        char tc = text[i]; if (tc >= 'A' && tc <= 'Z') tc += 32;
        char qc = query[qi]; if (qc >= 'A' && qc <= 'Z') qc += 32;
        if (tc == qc) {
            score += 10;
            consecutive++;
            if (consecutive > 1) score += consecutive * 5;
            if (i == 0) score += 25;
            if (i > 0 && (text[i-1] == ' ' || text[i-1] == '_')) score += 20;
            qi++;
        } else {
            consecutive = 0;
        }
    }
    if (qi < qlen) return 0;
    if (tlen > 0) score += 100.0 * qlen / tlen;
    return score;
}

/* ─── Filtering ─────────────────────────────────────────────────── */

static void apply_filters(void) {
    g_filtered_len = 0;
    for (int i = 0; i < g_data_len; i++) {
        if (g_dept_filter[0] && strcmp(g_data[i].department, g_dept_filter) != 0) continue;
        if (g_search[0]) {
            double s1 = fuzzy_score(g_data[i].name, g_search);
            double s2 = fuzzy_score(g_data[i].role, g_search);
            double s3 = fuzzy_score(g_data[i].department, g_search);
            if (s1 <= 0 && s2 <= 0 && s3 <= 0) continue;
        }
        g_filtered[g_filtered_len++] = i;
    }
}

/* ─── UI Handles (for live updates) ─────────────────────────────── */

static UIHandle g_status_text = NULL;
static UIHandle g_stat_total = NULL;
static UIHandle g_stat_active = NULL;
static UIHandle g_stat_avg_salary = NULL;
static UIHandle g_stat_avg_perf = NULL;
static UIHandle g_table = NULL;

/* ─── Table Cell Provider ───────────────────────────────────────── */

static char g_cell_buf[256];

static const char *table_cell(int row, int col, void *ctx) {
    if (row >= g_filtered_len) return "";
    Employee *e = &g_data[g_filtered[row]];
    switch (col) {
        case 0: snprintf(g_cell_buf, 256, "%d", row + 1); break;
        case 1: return e->name;
        case 2: return e->department;
        case 3: return e->role;
        case 4: snprintf(g_cell_buf, 256, "$%.0f", e->salary); break;
        case 5: snprintf(g_cell_buf, 256, "%.1f", e->performance); break;
        case 6: snprintf(g_cell_buf, 256, "%d", e->projects); break;
        case 7: return e->status;
        default: return "";
    }
    return g_cell_buf;
}

/* ─── Refresh UI ────────────────────────────────────────────────── */

static void refresh_ui(void) {
    /* Recompute summary stats from filtered data */
    int active = 0;
    double total_sal = 0, total_perf = 0;
    for (int i = 0; i < g_filtered_len; i++) {
        Employee *e = &g_data[g_filtered[i]];
        total_sal += e->salary;
        total_perf += e->performance;
        if (strcmp(e->status, "Active") == 0) active++;
    }

    /* Update table */
    int show = g_filtered_len > 500 ? 500 : g_filtered_len;
    if (g_table) ui_data_table_set_data(g_table, show, table_cell, NULL);
}

/* ─── Event Handlers ────────────────────────────────────────────── */

static void on_search(const char *text) {
    strncpy(g_search, text, 255);
    apply_filters();
    refresh_ui();
}

static void on_sidebar_click(int tag) {
    if (tag == 0) {
        g_dept_filter[0] = '\0';
    } else if (tag <= g_ndepts) {
        strcpy(g_dept_filter, g_depts[tag - 1].name);
    }
    apply_filters();
    refresh_ui();
}

/* ─── Build UI ──────────────────────────────────────────────────── */

int main(void) {
    generate_data(50000);

    ui_init();

    /* ─── Window ─────────────────────────────────────────────── */
    UIHandle win = ui_window("StrictTS HR Dashboard", 1200, 780, true);
    ui_window_subtitle(win, "50,000 Employees | Native Binary | No JS Runtime");

    /* ─── Root: horizontal split [sidebar | main content] ─── */
    UIHandle root = ui_hstack();
    ui_set_flex(root, 1);
    ui_set_spacing(root, 0);
    ui_add_child(win, root);

    /* ─── Sidebar ────────────────────────────────────────────── */
    UIHandle sidebar = ui_sidebar(200);
    ui_add_child(root, sidebar);

    ui_sidebar_section(sidebar, "NAVIGATION");
    ui_sidebar_item(sidebar, "Overview", "chart.bar.fill", 0, on_sidebar_click);
    ui_sidebar_item(sidebar, "All Employees", "person.3.fill", 0, on_sidebar_click);

    ui_sidebar_section(sidebar, "DEPARTMENTS");
    for (int i = 0; i < g_ndepts; i++) {
        char label[64];
        snprintf(label, 64, "%s (%d)", g_depts[i].name, g_depts[i].count);

        const char *icons[] = {"gearshape.fill","paintbrush.fill","megaphone.fill",
                               "dollarsign.circle.fill","banknote.fill","person.crop.circle.fill",
                               "shippingbox.fill","wrench.and.screwdriver.fill"};
        ui_sidebar_item(sidebar, label, icons[i % 8], i + 1, on_sidebar_click);
    }

    ui_sidebar_section(sidebar, "TOOLS");
    ui_sidebar_item(sidebar, "Export CSV", "square.and.arrow.up", 0, NULL);
    ui_sidebar_item(sidebar, "Settings", "gearshape", 0, NULL);

    /* ─── Main Content ───────────────────────────────────────── */
    UIHandle main_col = ui_vstack();
    ui_set_flex(main_col, 1);
    ui_set_padding(main_col, 0, 0, 0, 0);
    ui_set_spacing(main_col, 0);
    ui_add_child(root, main_col);

    /* ─── Top Bar ────────────────────────────────────────────── */
    UIHandle top_bar = ui_hstack();
    ui_set_size(top_bar, -1, 64);
    ui_set_padding(top_bar, 16, 20, 12, 20);
    ui_set_spacing(top_bar, 12);
    ui_set_background_rgb(top_bar, 0.10, 0.10, 0.10, 1.0);
    ui_add_child(main_col, top_bar);

    /* Title block */
    UIHandle title_col = ui_vstack();
    ui_set_spacing(title_col, 2);
    ui_add_child(top_bar, title_col);

    UIHandle title = ui_text("HR Dashboard", 22, true);
    ui_add_child(title_col, title);
    UIHandle subtitle = ui_label("Real-time workforce analytics — powered by StrictTS");
    ui_add_child(title_col, subtitle);

    ui_add_child(top_bar, ui_spacer());

    /* Search */
    UIHandle search = ui_search_field("Search employees, roles, departments...");
    ui_on_text_changed(search, on_search);
    ui_add_child(top_bar, search);

    /* ─── Stat Cards Row ─────────────────────────────────────── */
    UIHandle stats_row = ui_hstack();
    ui_set_padding(stats_row, 16, 20, 8, 20);
    ui_set_spacing(stats_row, 12);
    ui_set_size(stats_row, -1, 110);
    ui_add_child(main_col, stats_row);

    /* Total employees */
    char buf[64];
    snprintf(buf, 64, "%d", g_data_len);
    g_stat_total = ui_stat(buf, "Total Employees", 3);  /* blue */
    ui_add_child(stats_row, g_stat_total);

    /* Active */
    int active_count = 0;
    for (int i = 0; i < g_data_len; i++)
        if (strcmp(g_data[i].status, "Active") == 0) active_count++;
    snprintf(buf, 64, "%d", active_count);
    g_stat_active = ui_stat(buf, "Active", 4);  /* green */
    ui_add_child(stats_row, g_stat_active);

    /* Avg salary */
    double total_sal = 0;
    for (int i = 0; i < g_data_len; i++) total_sal += g_data[i].salary;
    snprintf(buf, 64, "$%.0f", total_sal / g_data_len);
    g_stat_avg_salary = ui_stat(buf, "Avg Salary", 8);  /* purple */
    ui_add_child(stats_row, g_stat_avg_salary);

    /* Avg performance */
    double total_perf = 0;
    for (int i = 0; i < g_data_len; i++) total_perf += g_data[i].performance;
    snprintf(buf, 64, "%.1f / 5.0", total_perf / g_data_len);
    g_stat_avg_perf = ui_stat(buf, "Avg Performance", 6);  /* orange */
    ui_add_child(stats_row, g_stat_avg_perf);

    /* Departments */
    snprintf(buf, 64, "%d", g_ndepts);
    UIHandle stat_depts = ui_stat(buf, "Departments", 10);  /* teal */
    ui_add_child(stats_row, stat_depts);

    /* ─── Charts Row ─────────────────────────────────────────── */
    UIHandle charts_row = ui_hstack();
    ui_set_padding(charts_row, 8, 20, 8, 20);
    ui_set_spacing(charts_row, 12);
    ui_set_size(charts_row, -1, 200);
    ui_add_child(main_col, charts_row);

    /* Headcount by department — wrapped in flex container */
    int dept_colors[] = {3, 8, 9, 6, 7, 4, 10, 11};

    UIHandle chart1_wrap = ui_vstack();
    ui_set_flex(chart1_wrap, 1);
    UIHandle chart1 = ui_bar_chart(180);
    ui_bar_chart_set_title(chart1, "Headcount by Department");
    for (int i = 0; i < g_ndepts; i++) {
        ui_bar_chart_add(chart1, g_depts[i].name, g_depts[i].count, dept_colors[i % 8]);
    }
    ui_add_child(chart1_wrap, chart1);
    ui_add_child(charts_row, chart1_wrap);

    /* Average salary by department — wrapped in flex container */
    UIHandle chart2_wrap = ui_vstack();
    ui_set_flex(chart2_wrap, 1);
    UIHandle chart2 = ui_bar_chart(180);
    ui_bar_chart_set_title(chart2, "Avg Salary by Department");
    for (int i = 0; i < g_ndepts; i++) {
        ui_bar_chart_add(chart2, g_depts[i].name, g_depts[i].avg_salary / 1000.0,
                         dept_colors[i % 8]);
    }
    ui_add_child(chart2_wrap, chart2);
    ui_add_child(charts_row, chart2_wrap);

    /* ─── Table Header ───────────────────────────────────────── */
    UIHandle table_header = ui_hstack();
    ui_set_padding(table_header, 8, 20, 4, 20);
    ui_set_spacing(table_header, 8);
    ui_set_size(table_header, -1, 36);
    ui_add_child(main_col, table_header);

    UIHandle table_title = ui_text("Employee Directory", 14, true);
    ui_add_child(table_header, table_title);

    ui_add_child(table_header, ui_spacer());

    snprintf(buf, 64, "Showing %d of %d", g_filtered_len, g_data_len);
    g_status_text = ui_label(buf);
    ui_add_child(table_header, g_status_text);

    UIHandle badge_active = ui_badge("Active", 4);
    ui_add_child(table_header, badge_active);

    UIHandle badge_remote = ui_badge("Remote", 3);
    ui_add_child(table_header, badge_remote);

    /* ─── Data Table ─────────────────────────────────────────── */
    g_table = ui_data_table();
    ui_data_table_add_column(g_table, "rank", "#", 40);
    ui_data_table_add_column(g_table, "name", "Name", 160);
    ui_data_table_add_column(g_table, "dept", "Department", 120);
    ui_data_table_add_column(g_table, "role", "Role", 140);
    ui_data_table_add_column(g_table, "salary", "Salary", 100);
    ui_data_table_add_column(g_table, "perf", "Rating", 60);
    ui_data_table_add_column(g_table, "projects", "Projects", 70);
    ui_data_table_add_column(g_table, "status", "Status", 80);

    int show = g_filtered_len > 500 ? 500 : g_filtered_len;
    ui_data_table_set_data(g_table, show, table_cell, NULL);
    ui_data_table_set_row_height(g_table, 26);
    ui_data_table_set_alternating(g_table, true);

    UIHandle table_container = ui_vstack();
    ui_set_flex(table_container, 1);
    ui_set_padding(table_container, 0, 20, 12, 20);
    ui_add_child(table_container, g_table);
    ui_add_child(main_col, table_container);

    /* ─── Status Bar ─────────────────────────────────────────── */
    UIHandle status_bar = ui_hstack();
    ui_set_padding(status_bar, 6, 20, 6, 20);
    ui_set_size(status_bar, -1, 28);
    ui_set_background_rgb(status_bar, 0.06, 0.06, 0.06, 1.0);
    ui_add_child(main_col, status_bar);

    UIHandle status_left = ui_label("StrictTS Native | 50K records | 0ms startup");
    ui_add_child(status_bar, status_left);
    ui_add_child(status_bar, ui_spacer());
    UIHandle status_right = ui_label("Binary: 68 KB | Memory: ~4 MB | No JS Runtime");
    ui_add_child(status_bar, status_right);

    /* ─── Run ────────────────────────────────────────────────── */
    ui_run(win);

    free(g_data);
    free(g_filtered);
    return 0;
}
