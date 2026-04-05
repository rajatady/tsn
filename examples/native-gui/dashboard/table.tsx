import { tableCellFn } from './state'

export function EmployeeTable() {
  return (
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
  )
}
