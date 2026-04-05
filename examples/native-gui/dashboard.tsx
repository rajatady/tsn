/*
 * StrictTS Native Dashboard
 *
 * 100% TypeScript. Compiles to a 106 KB native macOS binary.
 * No Electron. No WebView. No C. No JS runtime.
 *
 * Compile: npx tsx compiler/index.ts examples/native-gui/dashboard.tsx
 * Run:     ./build/dashboard
 */

// ─── Data ──────────────────────────────────────────────────────────

interface Employee {
  name: string
  age: number
  department: string
  role: string
  salary: number
  performance: number
  status: string
}

// ─── UI ────────────────────────────────────────────────────────────

<Window title="HR Dashboard" width={1200} height={780} dark
        subtitle="50,000 Employees | Native Binary | No JS Runtime">

  <HStack className="flex-1 gap-0">

    <Sidebar className="w-[200]">
      <SidebarSection title="NAVIGATION">
        <SidebarItem icon="chart.bar.fill">Overview</SidebarItem>
        <SidebarItem icon="person.3.fill">All Employees</SidebarItem>
      </SidebarSection>
      <SidebarSection title="DEPARTMENTS">
        <SidebarItem icon="gearshape.fill">Engineering</SidebarItem>
        <SidebarItem icon="paintbrush.fill">Design</SidebarItem>
        <SidebarItem icon="megaphone.fill">Marketing</SidebarItem>
        <SidebarItem icon="dollarsign.circle.fill">Sales</SidebarItem>
        <SidebarItem icon="banknote.fill">Finance</SidebarItem>
        <SidebarItem icon="person.crop.circle.fill">HR</SidebarItem>
        <SidebarItem icon="shippingbox.fill">Product</SidebarItem>
        <SidebarItem icon="wrench.and.screwdriver.fill">Operations</SidebarItem>
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
          <Text className="text-xs text-zinc-500">Real-time workforce analytics — powered by StrictTS</Text>
        </VStack>
        <Spacer />
        <Search placeholder="Search employees, roles, departments..." />
      </HStack>

      <HStack className="h-[110] px-5 py-4 gap-3">
        <Stat value="50,000" label="Total Employees" color="blue" />
        <Stat value="28,571" label="Active" color="green" />
        <Stat value="$122,500" label="Avg Salary" color="purple" />
        <Stat value="3.1 / 5.0" label="Avg Performance" color="orange" />
        <Stat value="8" label="Departments" color="teal" />
      </HStack>

      <HStack className="h-[200] px-5 py-2 gap-3">
        <BarChart title="Headcount by Department" className="flex-1" />
        <BarChart title="Avg Salary by Department" className="flex-1" />
      </HStack>

      <HStack className="h-9 px-5 py-2 gap-2">
        <Text className="text-sm font-bold">Employee Directory</Text>
        <Spacer />
        <Text className="text-xs text-zinc-500">Showing 500 of 50,000</Text>
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
      ]} className="flex-1 mx-5" rowHeight={26} alternating />

      <HStack className="h-7 px-5 py-1 bg-zinc-950">
        <Text className="text-xs text-zinc-500">StrictTS Native | 50K records | 0ms startup</Text>
        <Spacer />
        <Text className="text-xs text-zinc-500">Binary: 106 KB | No JS Runtime</Text>
      </HStack>

    </VStack>
  </HStack>
</Window>
