import { DashboardHeader, MetricsRow, DirectoryToolbar, DashboardFooter } from './components'
import { DashboardSidebar } from './sidebar'
import { EmployeeTable } from './table'

export function App() {
  return (
    <Window title="HR Dashboard" width={1200} height={780} dark
            subtitle="50,000 Employees | Native Binary | No JS Runtime">
      <HStack className="flex-1 gap-0">
        <DashboardSidebar />
        <VStack className="flex-1 gap-0">
          <DashboardHeader />
          <MetricsRow />
          <DirectoryToolbar />
          <EmployeeTable />
          <DashboardFooter />
        </VStack>
      </HStack>
    </Window>
  )
}
