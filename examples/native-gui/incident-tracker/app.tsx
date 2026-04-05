import { IncidentHeader, IncidentMetrics, IncidentFooter, TrackerPane } from './components'
import { IncidentSidebar } from './sidebar'
import { IncidentTable } from './table'

export function App() {
  return (
    <Window title="Incident Tracker" width={1220} height={760} dark
            subtitle="Native issue triage with StrictTS stdlib paths">
      <HStack className="flex-1 gap-0">
        <IncidentSidebar />
        <TrackerPane>
          <IncidentHeader />
          <IncidentMetrics />
          <IncidentTable />
          <IncidentFooter />
        </TrackerPane>
      </HStack>
    </Window>
  )
}
