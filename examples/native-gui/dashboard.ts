/*
 * StrictTS Native Dashboard
 *
 * This is what the TypeScript developer writes.
 * It looks like React + Tailwind. It compiles to a 107 KB native binary.
 *
 * The compiler sees Window(), HStack(), Text() etc. and emits C:
 *   Window(...)                    → ui_window(...)
 *   HStack({ className: "..." })  → ui_hstack() + parsed Tailwind props
 *   Text("hello", "text-xl bold") → ui_text("hello", 20, true)
 *   className="flex-1 px-5 h-16"  → ui_set_flex + ui_set_padding + ui_set_size
 */

// ─── Data ──────────────────────────────────────────────────────────

interface Employee {
  name: string
  age: number
  department: string
  role: string
  salary: number
  performance: number
  projects: number
  status: string
}

interface DeptInfo {
  name: string
  count: number
  avgSalary: number
  active: number
}

const employees: Employee[] = generateData(50000)
const departments: DeptInfo[] = computeDeptStats(employees)

let searchQuery = ""
let deptFilter = ""

function getFiltered(): Employee[] {
  return employees.filter(e => {
    if (deptFilter.length > 0 && e.department !== deptFilter) return false
    if (searchQuery.length > 0) {
      return fuzzyScore(e.name, searchQuery) > 0
        || fuzzyScore(e.role, searchQuery) > 0
    }
    return true
  })
}

// ─── Event Handlers ────────────────────────────────────────────────

function onSearch(text: string): void {
  searchQuery = text
  table.setData(getFiltered())
}

function onDeptClick(dept: string): void {
  deptFilter = dept
  table.setData(getFiltered())
}

// ─── UI ────────────────────────────────────────────────────────────

const table = Table({
  columns: [
    { id: "rank",     title: "#",          width: 40 },
    { id: "name",     title: "Name",       width: 160 },
    { id: "dept",     title: "Department", width: 120 },
    { id: "role",     title: "Role",       width: 140 },
    { id: "salary",   title: "Salary",     width: 100 },
    { id: "perf",     title: "Rating",     width: 60 },
    { id: "projects", title: "Projects",   width: 70 },
    { id: "status",   title: "Status",     width: 80 },
  ],
  data: employees,
  className: "flex-1 mx-5 mb-3",
  rowHeight: 26,
  alternating: true,
})

const app = Window("StrictTS HR Dashboard", {
  width: 1200, height: 780, dark: true,
  subtitle: "50,000 Employees | Native Binary | No JS Runtime",
  children: [

    HStack({ className: "flex-1 gap-0" }, [

      // ─── Sidebar ────────────────────────────────────────────
      Sidebar({ className: "w-[200]" }, [
        SidebarSection("NAVIGATION", [
          SidebarItem("Overview",      { icon: "chart.bar.fill",  onClick: () => onDeptClick("") }),
          SidebarItem("All Employees", { icon: "person.3.fill",   onClick: () => onDeptClick("") }),
        ]),
        SidebarSection("DEPARTMENTS",
          departments.map(d =>
            SidebarItem(d.name + " (" + String(d.count) + ")", {
              icon: "folder.fill",
              onClick: () => onDeptClick(d.name),
            })
          )
        ),
        SidebarSection("TOOLS", [
          SidebarItem("Export CSV", { icon: "square.and.arrow.up" }),
          SidebarItem("Settings",  { icon: "gearshape" }),
        ]),
      ]),

      // ─── Main Content ───────────────────────────────────────
      VStack({ className: "flex-1 gap-0" }, [

        // Header
        HStack({ className: "h-16 px-5 py-4 gap-3 bg-zinc-900" }, [
          VStack({ className: "gap-0.5" }, [
            Text("HR Dashboard", "text-2xl font-bold"),
            Text("Real-time workforce analytics — powered by StrictTS", "text-xs text-zinc-500"),
          ]),
          Spacer(),
          Search({ placeholder: "Search employees, roles, departments...", onChange: onSearch }),
        ]),

        // Stat Cards
        HStack({ className: "h-[110] px-5 py-4 gap-3" }, [
          Stat(String(employees.length),           "Total Employees", { color: "blue" }),
          Stat(String(countActive(employees)),      "Active",          { color: "green" }),
          Stat("$" + String(avgSalary(employees)),  "Avg Salary",      { color: "purple" }),
          Stat(avgPerf(employees) + " / 5.0",       "Avg Performance", { color: "orange" }),
          Stat(String(departments.length),           "Departments",     { color: "teal" }),
        ]),

        // Charts
        HStack({ className: "h-[200] px-5 py-2 gap-3" }, [
          BarChart({
            title: "Headcount by Department",
            className: "flex-1",
            data: departments.map(d => ({ label: d.name, value: d.count, color: "blue" })),
          }),
          BarChart({
            title: "Avg Salary by Department",
            className: "flex-1",
            data: departments.map(d => ({ label: d.name, value: d.avgSalary / 1000, color: "purple" })),
          }),
        ]),

        // Table header
        HStack({ className: "h-9 px-5 py-2 gap-2" }, [
          Text("Employee Directory", "text-sm font-bold"),
          Spacer(),
          Text("Showing " + String(employees.length) + " of " + String(employees.length), "text-xs text-zinc-500"),
          Badge("Active", { color: "green" }),
          Badge("Remote", { color: "blue" }),
        ]),

        // Data Table
        table,

        // Status Bar
        HStack({ className: "h-7 px-5 py-1.5 bg-zinc-950" }, [
          Text("StrictTS Native | 50K records | 0ms startup", "text-xs text-zinc-500"),
          Spacer(),
          Text("Binary: 107 KB | Memory: ~4 MB | No JS Runtime", "text-xs text-zinc-500"),
        ]),
      ]),
    ]),
  ],
})

render(app)
