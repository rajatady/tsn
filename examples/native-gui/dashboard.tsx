/*
 * StrictTS Native Dashboard — 100% TypeScript
 *
 * Compiles to a native macOS binary. No Electron. No C. No JS runtime.
 *
 * Compile: npx tsx compiler/index.ts examples/native-gui/dashboard.tsx
 * Run:     ./build/dashboard
 */

// ─── Data Model ────────────────────────────────────────────────────

interface Employee {
  name: string
  department: string
  role: string
  salary: number
  performance: number
  status: string
}

// ─── Lookup Functions ──────────────────────────────────────────────

function firstName(i: number): string {
  if (i === 0) return "Alice"
  if (i === 1) return "Bob"
  if (i === 2) return "Charlie"
  if (i === 3) return "Diana"
  if (i === 4) return "Eve"
  if (i === 5) return "Frank"
  if (i === 6) return "Grace"
  if (i === 7) return "Hank"
  if (i === 8) return "Ivy"
  if (i === 9) return "Jack"
  if (i === 10) return "Kate"
  if (i === 11) return "Leo"
  if (i === 12) return "Maya"
  if (i === 13) return "Noah"
  if (i === 14) return "Olivia"
  return "Pete"
}

function lastName(i: number): string {
  if (i === 0) return "Smith"
  if (i === 1) return "Jones"
  if (i === 2) return "Brown"
  if (i === 3) return "Davis"
  if (i === 4) return "Wilson"
  if (i === 5) return "Moore"
  if (i === 6) return "Taylor"
  if (i === 7) return "Clark"
  if (i === 8) return "Hall"
  if (i === 9) return "Lee"
  if (i === 10) return "Adams"
  if (i === 11) return "Baker"
  if (i === 12) return "Collins"
  if (i === 13) return "Foster"
  return "Garcia"
}

function deptName(i: number): string {
  if (i === 0) return "Engineering"
  if (i === 1) return "Design"
  if (i === 2) return "Marketing"
  if (i === 3) return "Sales"
  if (i === 4) return "Finance"
  if (i === 5) return "HR"
  if (i === 6) return "Product"
  return "Operations"
}

function roleName(i: number): string {
  if (i === 0) return "Senior Engineer"
  if (i === 1) return "Designer"
  if (i === 2) return "Manager"
  if (i === 3) return "Analyst"
  if (i === 4) return "Director"
  if (i === 5) return "Lead"
  if (i === 6) return "Associate"
  if (i === 7) return "Specialist"
  if (i === 8) return "VP"
  return "Coordinator"
}

function statusName(i: number): string {
  if (i < 4) return "Active"
  if (i < 6) return "Remote"
  return "On Leave"
}

// ─── PRNG (no bitwise ops — use modulo) ────────────────────────────

function nextRand(s: number): number {
  const raw = s * 1103515245 + 12345
  return raw - Math.floor(raw / 2147483648) * 2147483648
}

function randIndex(s: number, max: number): number {
  const v = Math.floor((s / 2147483647) * max)
  if (v >= max) return max - 1
  if (v < 0) return 0
  return v
}

// ─── Data Generation ───────────────────────────────────────────────

function makeEmployee(s: number): Employee {
  const s1 = nextRand(s)
  const s2 = nextRand(s1)
  const s3 = nextRand(s2)
  const s4 = nextRand(s3)
  const s5 = nextRand(s4)
  const s6 = nextRand(s5)
  const s7 = nextRand(s6)

  const emp: Employee = {
    name: firstName(randIndex(s1, 16)) + " " + lastName(randIndex(s2, 15)),
    department: deptName(randIndex(s3, 8)),
    role: roleName(randIndex(s4, 10)),
    salary: 45000 + randIndex(s5, 155000),
    performance: 1.0 + (s6 / 2147483647) * 4.0,
    status: statusName(randIndex(s7, 7))
  }
  return emp
}

function generateEmployees(n: number): Employee[] {
  const result: Employee[] = []
  let s = 42
  let i = 0
  while (i < n) {
    s = nextRand(s)
    const emp: Employee = makeEmployee(s)
    result.push(emp)
    s = nextRand(nextRand(nextRand(nextRand(nextRand(nextRand(nextRand(s)))))))
    i = i + 1
  }
  return result
}

// ─── Global State ──────────────────────────────────────────────────

const employees: Employee[] = generateEmployees(50000)
let searchText = ""
let deptFilterIdx = 0
let filteredCount = 0

// ─── Fuzzy Score ───────────────────────────────────────────────────

function fuzzyScore(text: string, query: string): number {
  if (query.length === 0) return 100
  if (text.length === 0) return 0
  let score = 0
  let qi = 0
  let consecutive = 0
  let i = 0
  while (i < text.length && qi < query.length) {
    const tc: string = text.slice(i, i + 1)
    const qc: string = query.slice(qi, qi + 1)
    if (tc === qc) {
      score = score + 10
      consecutive = consecutive + 1
      if (consecutive > 1) score = score + consecutive * 5
      qi = qi + 1
    } else {
      consecutive = 0
    }
    i = i + 1
  }
  if (qi < query.length) return 0
  return score
}

// ─── Filter Logic ──────────────────────────────────────────────────

function deptForTag(tag: number): string {
  if (tag === 2) return "Engineering"
  if (tag === 3) return "Design"
  if (tag === 4) return "Marketing"
  if (tag === 5) return "Sales"
  if (tag === 6) return "Finance"
  if (tag === 7) return "HR"
  if (tag === 8) return "Product"
  if (tag === 9) return "Operations"
  return ""
}

function matchesFilter(e: Employee): boolean {
  // Department filter
  if (deptFilterIdx > 1) {
    const want: string = deptForTag(deptFilterIdx)
    if (want.length > 0 && e.department !== want) return false
  }
  // Search filter
  if (searchText.length > 0) {
    const s1 = fuzzyScore(e.name, searchText)
    const s2 = fuzzyScore(e.role, searchText)
    if (s1 <= 0 && s2 <= 0) return false
  }
  return true
}

function countFiltered(): number {
  let count = 0
  let i = 0
  while (i < employees.length) {
    const e: Employee = employees[i]
    if (matchesFilter(e)) count = count + 1
    i = i + 1
  }
  return count
}

function nthFilteredEmployee(n: number): Employee {
  let count = 0
  let i = 0
  while (i < employees.length) {
    const e: Employee = employees[i]
    if (matchesFilter(e)) {
      if (count === n) return e
      count = count + 1
    }
    i = i + 1
  }
  // Fallback — shouldn't reach here
  return employees[0]
}

function applyFilters(): void {
  filteredCount = countFiltered()
}

// ─── Table Cell Callback ───────────────────────────────────────────

function tableCellFn(row: number, col: number): string {
  if (row >= filteredCount) return ""
  const e: Employee = nthFilteredEmployee(row)
  if (col === 0) return String(row + 1)
  if (col === 1) return e.name
  if (col === 2) return e.department
  if (col === 3) return e.role
  if (col === 4) return "$" + String(Math.floor(e.salary))
  if (col === 5) return String(Math.floor(e.performance * 10) / 10)
  if (col === 6) return e.status
  return ""
}

// ─── Event Handlers ────────────────────────────────────────────────

// refreshTable is auto-generated by the JSX compiler
declare function refreshTable(rows: number): void

function onSearch(text: string): void {
  searchText = text
  applyFilters()
  const show = filteredCount > 500 ? 500 : filteredCount
  refreshTable(show)
}

function onDeptClick(tag: number): void {
  deptFilterIdx = tag
  applyFilters()
  const show = filteredCount > 500 ? 500 : filteredCount
  refreshTable(show)
}

// ─── Init Filters ──────────────────────────────────────────────────

function initFilters(): void {
  applyFilters()
}

initFilters();

// ─── UI ────────────────────────────────────────────────────────────

<Window title="HR Dashboard" width={1200} height={780} dark
        subtitle="50,000 Employees | Native Binary a | No JS Runtime">

  <HStack className="flex-1 gap-0">

    <Sidebar className="w-[200]">
      <SidebarSection title="NAVIGATION">
        <SidebarItem icon="chart.bar.fill" onClick={onDeptClick}>Overview</SidebarItem>
        <SidebarItem icon="person.3.fill" onClick={onDeptClick}>All Employees</SidebarItem>
      </SidebarSection>
      <SidebarSection title="DEPARTMENTS">
        <SidebarItem icon="gearshape.fill" onClick={onDeptClick}>Engineering</SidebarItem>
        <SidebarItem icon="paintbrush.fill" onClick={onDeptClick}>Design</SidebarItem>
        <SidebarItem icon="megaphone.fill" onClick={onDeptClick}>Marketing</SidebarItem>
        <SidebarItem icon="dollarsign.circle.fill" onClick={onDeptClick}>Sales</SidebarItem>
        <SidebarItem icon="banknote.fill" onClick={onDeptClick}>Finance</SidebarItem>
        <SidebarItem icon="person.crop.circle.fill" onClick={onDeptClick}>HR</SidebarItem>
        <SidebarItem icon="shippingbox.fill" onClick={onDeptClick}>Product</SidebarItem>
        <SidebarItem icon="wrench.and.screwdriver.fill" onClick={onDeptClick}>Operations</SidebarItem>
      </SidebarSection>
      <SidebarSection title="TOOLS">
        <SidebarItem icon="square.and.arrow.up">Export CSV</SidebarItem>
        <SidebarItem icon="gearshape">Settings</SidebarItem>
      </SidebarSection>
    </Sidebar>

    <VStack className="flex-1 gap-0">

      <HStack className="h-16 px-5 py-4 gap-3 bg-zinc-900">
        <VStack className="gap-0">
          <Text className="text-2xl font-bold">HR Dashboard</Text>
          <Text className="text-xs text-zinc-500">Real-time workforce analytics</Text>
        </VStack>
        <Spacer />
        <Search placeholder="Search employees, roles..." onChange={onSearch} className="w-[280]" />
      </HStack>

      <HStack className="h-[110] px-5 py-4 gap-3">
        <Stat value="50,000" label="Total Employees" color="blue" />
        <Stat value="28,571" label="Active" color="green" />
        <Stat value="$122,500" label="Avg Salary" color="purple" />
        <Stat value="3.1 / 5.0" label="Performance" color="orange" />
        <Stat value="8" label="Departments" color="teal" />
      </HStack>

      <HStack className="h-9 px-5 py-2 gap-2">
        <Text className="text-sm font-bold">Employee Directory</Text>
        <Spacer />
        <Badge text="Active" color="green" />
        <Badge text="Remote" color="blue" />
      </HStack>

      <Table columns={[
        { id: "rank", title: "#", width: 40 },
        { id: "name", title: "Name", width: 160 },
        { id: "dept", title: "Department", width: 120 },
        { id: "role", title: "Role", width: 140 },
        { id: "salary", title: "Salary", width: 100 },
        { id: "perf", title: "Rating", width: 60 },
        { id: "status", title: "Status", width: 80 },
      ]} className="flex-1 mx-5" rowHeight={26} alternating
         cellFn={tableCellFn} rows={500} />


      <HStack className="h-7 px-5 py-1 bg-zinc-950">
        <Text className="text-xs text-zinc-500">StrictTS Native | 50K records</Text>
        <Spacer />
        <Text className="text-xs text-zinc-500">No JS Runtime</Text>
      </HStack>

    </VStack>
  </HStack>
</Window>
