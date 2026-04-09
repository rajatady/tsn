// Generates test input data for all 3 targets.
// Run once: node harness/generate-test-data.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── 1. JSON Pipeline: 10,000 person records ───────────────────────
const cities = ['New York', 'London', 'Tokyo', 'Berlin', 'Sydney', 'Paris', 'Toronto', 'Mumbai']
const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack']
const lastNames = ['Smith', 'Jones', 'Brown', 'Davis', 'Wilson', 'Moore', 'Taylor', 'Clark', 'Hall', 'Lee']

function seededRandom(seed) {
  let s = seed
  return function () {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

const rand = seededRandom(42) // deterministic!

const people = []
for (let i = 0; i < 100000; i++) {
  people.push({
    name: firstNames[Math.floor(rand() * firstNames.length)] + ' ' + lastNames[Math.floor(rand() * lastNames.length)],
    age: 18 + Math.floor(rand() * 50),
    city: cities[Math.floor(rand() * cities.length)],
    score: Math.round(rand() * 10000) / 100,
    active: rand() > 0.3,
  })
}

fs.writeFileSync(path.join(__dirname, 'test-data/large-dataset.json'), JSON.stringify(people))
console.log(`Generated ${people.length} person records → test-data/large-dataset.json`)

// ─── 2. Markdown sample ────────────────────────────────────────────
const markdown = `# Welcome to TSN

This is a **bold** statement about *compiling* TypeScript to native code.

## Why Native Compilation?

The idea is simple: if you have **type information** at compile time, you can emit
\`machine code\` instead of interpreting through V8.

### The Trade-offs

Here is a [link to the spec](https://example.com/spec) for reference.

Some things you lose:

- Dynamic property access
- The \`eval\` function
- Runtime type changes

\`\`\`
function add(a: number, b: number): number {
  return a + b
}
\`\`\`

## Performance

With **strict types** and no dynamic features, the compiler knows the exact
memory layout of every object. This means:

### No Boxing

Numbers are just \`double\` values on the stack. No heap allocation.

### No Garbage Collection Pressure

With arena allocation, we free everything at once at the end.

## Conclusion

This is a *real* markdown document with **bold**, *italic*, \`code\`,
[links](https://example.com), and code blocks. It exercises the full
parser pipeline.

### Final Thoughts

The gap between TypeScript and a **compilable language** is smaller than
most people think. We just need to *cut the right corners*.
`

// Repeat the markdown 200 times to create a substantial document
let bigMarkdown = ''
for (let i = 0; i < 200; i++) {
  bigMarkdown += markdown.replace(/^# /m, `# Section ${i + 1}: `)
  bigMarkdown += '\n---\n\n'
}
fs.writeFileSync(path.join(__dirname, 'test-data/sample.md'), bigMarkdown)
console.log(`Generated markdown sample (${bigMarkdown.length} bytes) → test-data/sample.md`)

console.log('Done.')
