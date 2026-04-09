import { buildTSN } from '../packages/tsn-compiler-core/src/build.js'

const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: npx tsx compiler/index.ts <file.ts|.tsx>')
  process.exit(1)
}

buildTSN(inputPath, process.argv.slice(3))
