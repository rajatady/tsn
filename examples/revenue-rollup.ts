/*
 * TSN Revenue Rollup
 *
 * Reads CSV sales summaries from stdin and prints a financial rollup.
 * Exercises:
 *   - parseFloat() / parseInt() for numeric parsing
 *   - count() for threshold-based reporting
 *   - sum(), min(), max() for number[] reductions
 *   - join() and findIndex() for summary labeling
 */

interface SaleRow {
  region: string
  revenue: number
  cost: number
  orders: number
}

import { createRequire } from "module";
const require = createRequire(import.meta.url);

function readStdin(): string {
  const fs = require("fs");
  return fs.readFileSync("/dev/stdin", "utf-8");
}

function parseRows(raw: string): SaleRow[] {
  const lines: string[] = raw.split("\n")
  const rows: SaleRow[] = []
  let i = 1
  while (i < lines.length) {
    const line: string = lines[i].trim()
    if (line.length === 0) {
      i = i + 1
      continue
    }
    const parts: string[] = line.split(",")
    if (parts.length < 4) {
      i = i + 1
      continue
    }
    const row: SaleRow = {
      region: parts[0].trim(),
      revenue: parseFloat(parts[1].trim()),
      cost: parseFloat(parts[2].trim()),
      orders: parseInt(parts[3].trim()),
    }
    rows.push(row)
    i = i + 1
  }
  return rows
}

function collectNumbers(rows: SaleRow[], field: string): number[] {
  const values: number[] = []
  let i = 0
  while (i < rows.length) {
    const row: SaleRow = rows[i]
    if (field === "revenue") values.push(row.revenue)
    else if (field === "cost") values.push(row.cost)
    else values.push(row.orders)
    i = i + 1
  }
  return values
}

function main(): void {
  const rows: SaleRow[] = parseRows(readStdin())
  const revenues: number[] = collectNumbers(rows, "revenue")
  const costs: number[] = collectNumbers(rows, "cost")
  const orders: number[] = collectNumbers(rows, "orders")
  const totalRevenue: number = revenues.sum()
  const totalCost: number = costs.sum()
  const totalOrders: number = orders.sum()
  const topRevenue: number = revenues.max()
  const lowestCost: number = costs.min()
  const highRevenueCount: number = rows.count((row: SaleRow): boolean => row.revenue >= 120000)
  const bestIdx: number = rows.findIndex((row: SaleRow): boolean => row.revenue === topRevenue)
  const topRegion: string = bestIdx === -1 ? "" : rows[bestIdx].region
  const summaryRegions: string[] = []
  let i = 0
  while (i < rows.length) {
    if (rows[i].revenue >= 120000) summaryRegions.push(rows[i].region)
    i = i + 1
  }

  console.log("=== REVENUE ROLLUP ===")
  console.log("Rows: " + String(rows.length))
  console.log("Total revenue: " + String(totalRevenue))
  console.log("Total cost: " + String(totalCost))
  console.log("Gross margin: " + String(totalRevenue - totalCost))
  console.log("Total orders: " + String(totalOrders))
  console.log("Highest revenue: " + String(topRevenue))
  console.log("Lowest cost: " + String(lowestCost))
  console.log("Top region: " + topRegion)
  console.log("Regions above 120k revenue: " + String(highRevenueCount))
  console.log("High revenue regions: " + summaryRegions.join(", "))
}

main()
