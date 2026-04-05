/**
 * StrictTS Inspector CLI — query running app's view tree
 *
 * Usage:
 *   npx tsx compiler/inspect.ts tree            — dump view hierarchy
 *   npx tsx compiler/inspect.ts screenshot      — save screenshot to /tmp
 *   npx tsx compiler/inspect.ts click <label>   — click a button
 *   npx tsx compiler/inspect.ts type <text>     — type into search field
 *   npx tsx compiler/inspect.ts find <text>     — find elements containing text
 *   npx tsx compiler/inspect.ts get <id> [prop] — get element property
 */

import * as net from 'node:net'

const SOCK = '/tmp/strictts-inspect.sock'
const args = process.argv.slice(2)
const cmd = args.join(' ') || 'help'

const client = net.createConnection(SOCK, () => {
  client.write(cmd)
})

client.on('data', (data) => {
  process.stdout.write(data.toString())
  client.end()
})

client.on('error', (err: any) => {
  if (err.code === 'ENOENT' || err.code === 'ECONNREFUSED') {
    console.error('No running StrictTS app found. Start one with: strictts dev <file.tsx>')
  } else {
    console.error('Error:', err.message)
  }
  process.exit(1)
})

client.on('end', () => {
  process.exit(0)
})
