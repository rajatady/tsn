/*
 * StrictTS Native Dashboard — 100% TypeScript
 *
 * Compiles to a native macOS binary. No Electron. No C. No JS runtime.
 *
 * Compile: npx tsx compiler/index.ts examples/native-gui/dashboard.tsx
 * Run:     ./build/dashboard
 */

import { Employee } from './lib/types'
import { generateEmployees } from './lib/data'
import { fuzzyScore } from './lib/search'
import { deptForTag } from './lib/lookups'

// ─── Global State ──────────────────────────────────────────────────

const employees: Employee[] = generateEmployees(50000)
let searchText = ""
let deptFilterIdx = 0
let filteredCount = 0

// ─── Filter Logic ──────────────────────────────────────────────────

function matchesFilter(e: Employee): boolean {
  if (deptFilterIdx > 1) {
    const want: string = deptForTag(deptFilterIdx)
    if (want.length > 0 && e.department !== want) return false
  }
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

// ─── Init ──────────────────────────────────────────────────────────

function initFilters(): void {
  applyFilters()
}

initFilters();

// ─── UI ────────────────────────────────────────────────────────────

<Window title="HR Dashboard" width={1200} height={780} dark
        subtitle="50,000 Employees | Native Binary | No JS Runtime">

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
        <Text className="text-xs text-zinc-500">StrictTS Native | 50K records | Multi-file imports</Text>
        <Spacer />
        <Text className="text-xs text-zinc-500">No JS Runtime</Text>
      </HStack>

    </VStack>
  </HStack>
</Window>
