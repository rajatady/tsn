import { useStore } from '../../../packages/tsn-ui/src/react'
import { Issue, seedIssues } from './data'

const issues: Issue[] = seedIssues()
let searchText = ""
let statusFilterTag = 0
let filteredCount = 0

declare function refreshTable(rows: number): void

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

export function tableCellFn(row: number, col: number): string {
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

export function onSearch(text: string): void {
  searchText = text.trim()
  const [query, setQuery] = useStore<string>('incident-tracker:query', "")
  setQuery(searchText)
  applyFilters()
  refreshTable(filteredCount)
}

export function onStatusClick(tag: number): void {
  statusFilterTag = tag
  applyFilters()
  refreshTable(filteredCount)
}

export function onResetClick(): void {
  searchText = ""
  statusFilterTag = 0
  const [query, setQuery] = useStore<string>('incident-tracker:query', "")
  setQuery("")
  applyFilters()
  refreshTable(filteredCount)
}

export function initIncidentTracker(): void {
  const [query, setQuery] = useStore<string>('incident-tracker:query', "")
  setQuery("")
  applyFilters()
}
