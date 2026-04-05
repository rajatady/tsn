// Generate a 1 million row CSV for benchmarking
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cities = ['New York', 'London', 'Tokyo', 'Berlin', 'Sydney', 'Paris', 'Toronto', 'Mumbai']
const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack']
const lastNames = ['Smith', 'Jones', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Clark', 'Hall', 'Lee']

function seededRandom(seed) {
  let s = seed
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
}

const rand = seededRandom(42)
const lines = ['name,age,city,score']

const ROWS = 1_000_000
for (let i = 0; i < ROWS; i++) {
  const name = firstNames[Math.floor(rand() * firstNames.length)] + ' ' + lastNames[Math.floor(rand() * lastNames.length)]
  const age = 18 + Math.floor(rand() * 50)
  const city = cities[Math.floor(rand() * cities.length)]
  const score = Math.round(rand() * 10000) / 100
  lines.push(`${name},${age},${city},${score}`)
}

const outPath = path.join(__dirname, 'test-data/large.csv')
fs.writeFileSync(outPath, lines.join('\n'))
console.log(`Generated ${ROWS} rows → ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(1)} MB)`)
