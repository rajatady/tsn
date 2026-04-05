import { Employee } from '../lib/types'
import { generateEmployees } from '../lib/data'
import { fuzzyScore } from '../lib/search'
import { deptForTag } from '../lib/lookups'

const employees: Employee[] = generateEmployees(50000)
let searchText = ""
let deptFilterIdx = 0
let filteredCount = 0

declare function refreshTable(rows: number): void

function matchesFilter(e: Employee): boolean {
  if (deptFilterIdx > 1) {
    const want: string = deptForTag(deptFilterIdx)
    if (want.length > 0 && e.department !== want) return false
  }
  if (searchText.length > 0) {
    const s1 = fuzzyScore(e.name, searchText)
    const s2 = fuzzyScore(e.role, searchText)
    const deptMatch = e.department.includes(searchText)
    const statusMatch = e.status.includes(searchText)
    if (s1 <= 0 && s2 <= 0 && !deptMatch && !statusMatch) return false
  }
  return true
}

function countFiltered(): number {
  let count = 0
  let i = 0
  while (i < employees.length) {
    const e: Employee = employees[i]
    if (matchesFilter(e)) count = count + 1
    i = i + 1
  }
  return count
}

function nthFilteredEmployee(n: number): Employee {
  let count = 0
  let i = 0
  while (i < employees.length) {
    const e: Employee = employees[i]
    if (matchesFilter(e)) {
      if (count === n) return e
      count = count + 1
    }
    i = i + 1
  }
  return employees[0]
}

function applyFilters(): void {
  filteredCount = countFiltered()
}

export function tableCellFn(row: number, col: number): string {
  if (row >= filteredCount) return ""
  const e: Employee = nthFilteredEmployee(row)
  if (col === 0) return String(row + 1)
  if (col === 1) return e.name
  if (col === 2) return e.department
  if (col === 3) return e.role
  if (col === 4) return "$" + String(Math.floor(e.salary))
  if (col === 5) return String(Math.floor(e.performance * 10) / 10)
  if (col === 6) return e.status
  return ""
}

export function onSearch(text: string): void {
  searchText = text.trim()
  applyFilters()
  const show = filteredCount > 500 ? 500 : filteredCount
  refreshTable(show)
}

export function onDeptClick(tag: number): void {
  deptFilterIdx = tag
  applyFilters()
  const show = filteredCount > 500 ? 500 : filteredCount
  refreshTable(show)
}

export function initDashboard(): void {
  applyFilters()
}
