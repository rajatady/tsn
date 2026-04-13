import { runTSN } from '../packages/tsn-compiler-core/src/run.js'

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: npx tsx compiler/run.ts <file.ts|.tsx>')
  process.exit(1)
}

runTSN(inputPath, process.argv.slice(3))
