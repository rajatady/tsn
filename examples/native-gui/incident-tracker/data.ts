export interface Issue {
  key: string
  title: string
  assignee: string
  status: string
  tagLabel: string
}

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

export function seedIssues(): Issue[] {
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
