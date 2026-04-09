/**
 * Lookup functions for employee data generation
 * (Chains of if-statements because TSN doesn't support array literals)
 */

export function firstName(i: number): string {
  if (i === 0) return "Alice"
  if (i === 1) return "Bob"
  if (i === 2) return "Charlie"
  if (i === 3) return "Diana"
  if (i === 4) return "Eve"
  if (i === 5) return "Frank"
  if (i === 6) return "Grace"
  if (i === 7) return "Hank"
  if (i === 8) return "Ivy"
  if (i === 9) return "Jack"
  if (i === 10) return "Kate"
  if (i === 11) return "Leo"
  if (i === 12) return "Maya"
  if (i === 13) return "Noah"
  if (i === 14) return "Olivia"
  return "Pete"
}

export function lastName(i: number): string {
  if (i === 0) return "Smith"
  if (i === 1) return "Jones"
  if (i === 2) return "Brown"
  if (i === 3) return "Davis"
  if (i === 4) return "Wilson"
  if (i === 5) return "Moore"
  if (i === 6) return "Taylor"
  if (i === 7) return "Clark"
  if (i === 8) return "Hall"
  if (i === 9) return "Lee"
  if (i === 10) return "Adams"
  if (i === 11) return "Baker"
  if (i === 12) return "Collins"
  if (i === 13) return "Foster"
  return "Garcia"
}

export function deptName(i: number): string {
  if (i === 0) return "Engineering"
  if (i === 1) return "Design"
  if (i === 2) return "Marketing"
  if (i === 3) return "Sales"
  if (i === 4) return "Finance"
  if (i === 5) return "HR"
  if (i === 6) return "Product"
  return "Operations"
}

export function roleName(i: number): string {
  if (i === 0) return "Senior Engineer"
  if (i === 1) return "Designer"
  if (i === 2) return "Manager"
  if (i === 3) return "Analyst"
  if (i === 4) return "Director"
  if (i === 5) return "Lead"
  if (i === 6) return "Associate"
  if (i === 7) return "Specialist"
  if (i === 8) return "VP"
  return "Coordinator"
}

export function statusName(i: number): string {
  if (i < 4) return "Active"
  if (i < 6) return "Remote"
  return "On Leave"
}

export function deptForTag(tag: number): string {
  if (tag === 2) return "Engineering"
  if (tag === 3) return "Design"
  if (tag === 4) return "Marketing"
  if (tag === 5) return "Sales"
  if (tag === 6) return "Finance"
  if (tag === 7) return "HR"
  if (tag === 8) return "Product"
  if (tag === 9) return "Operations"
  return ""
}
