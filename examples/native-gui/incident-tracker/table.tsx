import { tableCellFn } from './state'

export function IncidentTable() {
  return (
    <Table columns={[
      { id: "key", title: "Issue", width: 90 },
      { id: "project", title: "Project", width: 90 },
      { id: "title", title: "Title", width: 320 },
      { id: "assignee", title: "Owner", width: 110 },
      { id: "status", title: "Status", width: 120 },
      { id: "tags", title: "Tags", width: 260 },
    ]} className="flex-1 mx-5" rowHeight={28} alternating
       cellFn={tableCellFn} rows={12} />
  )
}
