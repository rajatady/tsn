import { onSearch } from './state'

interface MetricProps {
  value: string
  label: string
  color: string
}

export function Metric({ value, label, color }: MetricProps) {
  return (
    <Stat value={value} label={label} color={color} />
  )
}

export function DashboardHeader() {
  return (
    <HStack className="h-16 px-5 py-4 gap-3 bg-zinc-900">
      <VStack className="gap-0">
        <Text className="text-2xl font-bold">HR Dashboard</Text>
        <Text className="text-xs text-zinc-500">Real-time workforce analytics</Text>
      </VStack>
      <Spacer />
      <Search placeholder="Search employees, roles..." onChange={onSearch} className="w-[280]" />
    </HStack>
  )
}

export function MetricsRow() {
  return (
    <HStack className="h-[110] px-5 py-4 gap-3">
      <Metric value="50,000" label="Total Employees" color="blue" />
      <Metric value="28,571" label="Active" color="green" />
      <Metric value="$122,500" label="Avg Salary" color="purple" />
      <Metric value="3.1 / 5.0" label="Performance" color="orange" />
      <Metric value="8" label="Departments" color="teal" />
    </HStack>
  )
}

export function DirectoryToolbar() {
  return (
    <HStack className="h-9 px-5 py-2 gap-2">
      <Text className="text-sm font-bold">Employee Directory</Text>
      <Spacer />
      <Badge text="Active" color="green" />
      <Badge text="Remote" color="blue" />
    </HStack>
  )
}

export function DashboardFooter() {
  return (
    <HStack className="h-7 px-5 py-1 bg-zinc-950">
      <Text className="text-xs text-zinc-500">StrictTS Native | 50K records | Multi-file imports</Text>
      <Spacer />
      <Text className="text-xs text-zinc-500">No JS Runtime</Text>
    </HStack>
  )
}
