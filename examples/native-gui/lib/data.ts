/**
 * Employee data generation — 50K records from a PRNG
 */

import { Employee } from './types'
import { nextRand, randIndex } from './rand'
import { firstName, lastName, deptName, roleName, statusName } from './lookups'

export function makeEmployee(s: number): Employee {
  const s1 = nextRand(s)
  const s2 = nextRand(s1)
  const s3 = nextRand(s2)
  const s4 = nextRand(s3)
  const s5 = nextRand(s4)
  const s6 = nextRand(s5)
  const s7 = nextRand(s6)

  const emp: Employee = {
    name: firstName(randIndex(s1, 16)) + " " + lastName(randIndex(s2, 15)),
    department: deptName(randIndex(s3, 8)),
    role: roleName(randIndex(s4, 10)),
    salary: 45000 + randIndex(s5, 155000),
    performance: 1.0 + (s6 / 2147483647) * 4.0,
    status: statusName(randIndex(s7, 7))
  }
  return emp
}

export function generateEmployees(n: number): Employee[] {
  const result: Employee[] = []
  let s = 42
  let i = 0
  while (i < n) {
    s = nextRand(s)
    const emp: Employee = makeEmployee(s)
    result.push(emp)
    s = nextRand(nextRand(nextRand(nextRand(nextRand(nextRand(nextRand(s)))))))
    i = i + 1
  }
  return result
}
