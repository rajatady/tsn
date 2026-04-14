/*
 * TSN Revenue Rollup
 *
 * Reads CSV sales summaries from stdin and prints a financial rollup.
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
  const rows: SaleRow[] = []
  const lines: string[] = raw.split("\n")
  for (let i: number = 1; i < lines.length; i += 1) {
    const line: string = lines[i].trim()
    if (line.length === 0) continue
    const parts: string[] = line.split(",")
    if (parts.length < 4) continue
    const [region, revenueStr, costStr, ordersStr] = parts
    const row: SaleRow = {
      region: region.trim(),
      revenue: parseFloat(revenueStr.trim()),
      cost: parseFloat(costStr.trim()),
      orders: parseInt(ordersStr.trim()),
    }
    rows.push(row)
  }
  return rows
}

function main(): void {
  const rows: SaleRow[] = parseRows(readStdin())
  const revenues: number[] = rows.map((row: SaleRow): number => row.revenue)
  const costs: number[] = rows.map((row: SaleRow): number => row.cost)
  const orders: number[] = rows.map((row: SaleRow): number => row.orders)

  const totalRevenue: number = revenues.reduce((a: number, b: number): number => a + b, 0)
  const totalCost: number = costs.reduce((a: number, b: number): number => a + b, 0)
  const topRevenue: number = revenues.reduce((a: number, b: number): number => a > b ? a : b, 0)
  const highRevenueCount: number = rows.filter((row: SaleRow): boolean => row.revenue >= 120000).length
  const bestIdx: number = rows.findIndex((row: SaleRow): boolean => row.revenue === topRevenue)
  const topRegion: string = bestIdx === -1 ? "" : rows[bestIdx].region
  const highRows: SaleRow[] = rows.filter((row: SaleRow): boolean => row.revenue >= 120000)
  const summaryRegions: string[] = highRows.map((row: SaleRow): string => row.region)

  console.log("=== REVENUE ROLLUP ===")
  console.log("Rows: " + String(rows.length))
  console.log("Total revenue: " + String(totalRevenue))
  console.log("Total cost: " + String(totalCost))
  console.log("Gross margin: " + String(totalRevenue - totalCost))
  console.log("Total orders: " + String(orders.reduce((a: number, b: number): number => a + b, 0)))
  console.log("Highest revenue: " + String(topRevenue))
  console.log("Lowest cost: " + String(costs.reduce((a: number, b: number): number => a < b ? a : b, costs[0])))
  console.log("Top region: " + topRegion)
  console.log("Regions above 120k revenue: " + String(highRevenueCount))
  console.log("High revenue regions: " + summaryRegions.join(", "))
}

main()
