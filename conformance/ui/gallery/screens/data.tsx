import { incrementConformanceCounter, conformanceTableCell } from '../state'

export function DataConformanceScreen() {
  return (
    <VStack className="gap-6">
      <Text className="text-2xl font-bold">Data Primitives</Text>

      <Card className="rounded-2xl bg-zinc-800">
        <VStack className="gap-4 p-5">
          <Progress testId="data.progress.determinate" value={0.62} />
          <Progress testId="data.progress.indeterminate" value={-1} />
          <BarChart testId="data.chart" title="Synthetic throughput" className="h-[220]" />
        </VStack>
      </Card>

      <Card className="rounded-2xl bg-zinc-800">
        <VStack className="gap-4 p-5">
          <Text className="text-lg font-bold">Table Conformance</Text>
          <Table
            testId="data.table"
            columns={[
              { id: 'name', title: 'Name', width: 220 },
              { id: 'kind', title: 'Kind', width: 220 },
              { id: 'status', title: 'Status', width: 180 },
            ]}
            rows={3}
            rowHeight={28}
            alternating
            cellFn={conformanceTableCell}
            className="w-[760] h-[200]"
          />
        </VStack>
      </Card>

      <Button testId="data.increment" variant="primary" onClick={incrementConformanceCounter}>Increment Counter</Button>
    </VStack>
  )
}
