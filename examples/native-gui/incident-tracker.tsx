/*
 * StrictTS Native Incident Tracker
 *
 * Exercises newer stdlib paths in a real TSX app:
 *   - trim() on search input
 *   - includes() for filtering
 *   - indexOf() for project key parsing
 *   - join() for tag display
 *
 * Compile: npx tsx compiler/index.ts examples/native-gui/incident-tracker.tsx
 * Run:     ./build/incident-tracker
 */

interface Issue {
  key: string
  title: string
  assignee: string
  status: string
  tagLabel: string
}

declare function refreshTable(rows: number): void

function makeTags(a: string, b: string, c: string): string[] {
  const tags: string[] = []
  if (a.length > 0) tags.push(a)
  if (b.length > 0) tags.push(b)
  if (c.length > 0) tags.push(c)
  return tags
}

function makeIssue(
  key: string,
  title: string,
  assignee: string,
  status: string,
  tagA: string,
  tagB: string,
  tagC: string
): Issue {
  const tags: string[] = makeTags(tagA, tagB, tagC)
  const tagLabel: string = tags.join(", ")
  const issue: Issue = {
    key: key,
    title: title,
    assignee: assignee,
    status: status,
    tagLabel: tagLabel
  }
  return issue
}

function seedIssues(): Issue[] {
  const list: Issue[] = []
  list.push(makeIssue("OPS-104", "API latency spike in us-east-1", "Nina", "Investigating", "p1", "latency", "api"))
  list.push(makeIssue("OPS-108", "Checkout retries after payment timeout", "Aarav", "Mitigated", "payments", "retry", "revenue"))
  list.push(makeIssue("SEC-212", "Rotate leaked preview token", "Maya", "Review", "security", "token", "infra"))
  list.push(makeIssue("APP-331", "Crash when exporting weekly report", "Jon", "Backlog", "desktop", "export", "reporting"))
  list.push(makeIssue("DATA-91", "Warehouse freshness lag on finance dashboard", "Ishita", "Investigating", "etl", "finance", "freshness"))
  list.push(makeIssue("OPS-111", "Websocket disconnects during deploy", "Nina", "Done", "realtime", "deploy", "incident"))
  list.push(makeIssue("APP-337", "Search panel ignores trailing spaces", "Ravi", "In Progress", "search", "ux", "input"))
  list.push(makeIssue("SEC-219", "Tighten S3 public access rules", "Maya", "In Progress", "security", "storage", ""))
  list.push(makeIssue("DATA-97", "Join mismatch on campaign attribution", "Ishita", "Review", "sql", "marketing", "attribution"))
  list.push(makeIssue("OPS-117", "Worker queue saturation after cron burst", "Aarav", "Mitigated", "queue", "cron", "throughput"))
  list.push(makeIssue("APP-344", "Native table row height clips badge text", "Jon", "Backlog", "native-ui", "table", ""))
  list.push(makeIssue("OPS-121", "Log sampler drops 500 responses", "Ravi", "Investigating", "logging", "sampling", "errors"))
  return list
}

const issues: Issue[] = seedIssues()
let searchText = ""
let statusFilterTag = 0
let filteredCount = 0

function projectKey(issue: Issue): string {
  const dash = issue.key.indexOf("-")
  if (dash === -1) return issue.key
  return issue.key.slice(0, dash)
}

function tagsLabel(issue: Issue): string {
  return issue.tagLabel
}

function statusForTag(tag: number): string {
  if (tag === 1) return "Investigating"
  if (tag === 2) return "Mitigated"
  if (tag === 3) return "In Progress"
  if (tag === 4) return "Review"
  if (tag === 5) return "Backlog"
  if (tag === 6) return "Done"
  return ""
}

function matchesFilter(issue: Issue): boolean {
  if (statusFilterTag > 0) {
    const want: string = statusForTag(statusFilterTag)
    if (want.length > 0 && issue.status !== want) return false
  }

  if (searchText.length === 0) return true

  const tags: string = tagsLabel(issue)
  if (issue.key.includes(searchText)) return true
  if (projectKey(issue).includes(searchText)) return true
  if (issue.title.includes(searchText)) return true
  if (issue.assignee.includes(searchText)) return true
  if (issue.status.includes(searchText)) return true
  if (tags.includes(searchText)) return true
  return false
}

function countFiltered(): number {
  let count = 0
  let i = 0
  while (i < issues.length) {
    const issue: Issue = issues[i]
    if (matchesFilter(issue)) count = count + 1
    i = i + 1
  }
  return count
}

function nthFilteredIssue(n: number): Issue {
  let count = 0
  let i = 0
  while (i < issues.length) {
    const issue: Issue = issues[i]
    if (matchesFilter(issue)) {
      if (count === n) return issue
      count = count + 1
    }
    i = i + 1
  }
  return issues[0]
}

function applyFilters(): void {
  filteredCount = countFiltered()
}

function tableCellFn(row: number, col: number): string {
  if (row >= filteredCount) return ""
  const issue: Issue = nthFilteredIssue(row)
  if (col === 0) return issue.key
  if (col === 1) return projectKey(issue)
  if (col === 2) return issue.title
  if (col === 3) return issue.assignee
  if (col === 4) return issue.status
  if (col === 5) return tagsLabel(issue)
  return ""
}

function onSearch(text: string): void {
  searchText = text.trim()
  applyFilters()
  refreshTable(filteredCount)
}

function onStatusClick(tag: number): void {
  statusFilterTag = tag
  applyFilters()
  refreshTable(filteredCount)
}

applyFilters();

<Window title="Incident Tracker" width={1220} height={760} dark
        subtitle="Native issue triage with StrictTS stdlib paths">

  <HStack className="flex-1 gap-0">

    <Sidebar className="w-[220]">
      <SidebarSection title="QUEUE">
        <SidebarItem icon="tray.full.fill" onClick={onStatusClick}>All Incidents</SidebarItem>
      </SidebarSection>
      <SidebarSection title="STATUS">
        <SidebarItem icon="bolt.horizontal.fill" onClick={onStatusClick}>Investigating</SidebarItem>
        <SidebarItem icon="bandage.fill" onClick={onStatusClick}>Mitigated</SidebarItem>
        <SidebarItem icon="hammer.fill" onClick={onStatusClick}>In Progress</SidebarItem>
        <SidebarItem icon="checkmark.seal.fill" onClick={onStatusClick}>Review</SidebarItem>
        <SidebarItem icon="clock.fill" onClick={onStatusClick}>Backlog</SidebarItem>
        <SidebarItem icon="checkmark.circle.fill" onClick={onStatusClick}>Done</SidebarItem>
      </SidebarSection>
    </Sidebar>

    <VStack className="flex-1 gap-0">
      <HStack className="h-16 px-5 py-4 gap-3 bg-zinc-900">
        <VStack className="gap-0">
          <Text className="text-2xl font-bold">Incident Tracker</Text>
          <Text className="text-xs text-zinc-500">Filter by status, project key, assignee, or tags</Text>
        </VStack>
        <Spacer />
        <Search placeholder="Search OPS, Maya, security, latency..." onChange={onSearch} className="w-[320]" />
      </HStack>

      <HStack className="h-[110] px-5 py-4 gap-3">
        <Stat value="12" label="Open Examples" color="blue" />
        <Stat value="4" label="Investigating" color="red" />
        <Stat value="3" label="Review / In Progress" color="orange" />
        <Stat value="3" label="Security / Data" color="purple" />
      </HStack>

      <Table columns={[
        { id: "key", title: "Issue", width: 90 },
        { id: "project", title: "Project", width: 90 },
        { id: "title", title: "Title", width: 320 },
        { id: "assignee", title: "Owner", width: 110 },
        { id: "status", title: "Status", width: 120 },
        { id: "tags", title: "Tags", width: 260 },
      ]} className="flex-1 mx-5" rowHeight={28} alternating
         cellFn={tableCellFn} rows={12} />

      <HStack className="h-7 px-5 py-1 bg-zinc-950">
        <Text className="text-xs text-zinc-500">Uses trim(), includes(), indexOf(), and join() in native UI code</Text>
        <Spacer />
        <Text className="text-xs text-zinc-500">StrictTS stdlib integration check</Text>
      </HStack>
    </VStack>
  </HStack>
</Window>
