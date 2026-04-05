import { onResetClick, onSearch } from './state'

interface MetricProps {
  value: string
  label: string
  color: string
}

interface PanelHeaderProps {
  title: string
  subtitle: string
  children: JSX.Element
}

interface TrackerPaneProps {
  children: JSX.Element
}

export function Metric({ value, label, color }: MetricProps) {
  return (
    <Stat value={value} label={label} color={color} />
  )
}

export function PanelHeader({ title, subtitle, children }: PanelHeaderProps) {
  return (
    <HStack className="h-16 px-5 py-4 gap-3 bg-zinc-900">
      <VStack className="gap-0">
        <Text className="text-2xl font-bold">{title}</Text>
        <Text className="text-xs text-zinc-500">{subtitle}</Text>
      </VStack>
      <Spacer />
      {children}
    </HStack>
  )
}

export function TrackerPane({ children }: TrackerPaneProps) {
  return (
    <VStack className="flex-1 gap-0">{children}</VStack>
  )
}

export function IncidentHeader() {
  return (
    <PanelHeader title="Incident Tracker"
                 subtitle="Filter by status, project key, assignee, or tags">
      <Search placeholder="Search OPS, Maya, security, latency..." onChange={onSearch} className="w-[320]" />
      <Button variant="ghost" onClick={onResetClick}>Reset</Button>
    </PanelHeader>
  )
}

export function IncidentMetrics() {
  return (
    <Card className="mx-5 rounded-lg">
      <HStack className="h-[110] px-5 py-4 gap-3">
        <Metric value="12" label="Open Examples" color="blue" />
        <Metric value="4" label="Investigating" color="red" />
        <Metric value="3" label="Review / In Progress" color="orange" />
        <Metric value="3" label="Security / Data" color="purple" />
      </HStack>
    </Card>
  )
}

export function IncidentFooter() {
  return (
    <HStack className="h-7 px-5 py-1 bg-zinc-950">
      <Text className="text-xs text-zinc-500">Uses trim(), includes(), indexOf(), and join() in native UI code</Text>
      <Spacer />
      <Text className="text-xs text-zinc-500">StrictTS stdlib integration check</Text>
    </HStack>
  )
}
