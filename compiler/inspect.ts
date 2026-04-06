/**
 * StrictTS Inspector CLI — query running app's view tree
 *
 * Usage:
 *   npx tsx compiler/inspect.ts tree                     — dump view hierarchy
 *   npx tsx compiler/inspect.ts screenshot               — save screenshot to /tmp
 *   npx tsx compiler/inspect.ts click <label>            — click a button
 *   npx tsx compiler/inspect.ts clickid <id>             — click a specific element
 *   npx tsx compiler/inspect.ts type <text>              — type into search field
 *   npx tsx compiler/inspect.ts typeid <id> <text>       — type into a specific input
 *   npx tsx compiler/inspect.ts find <text>              — find elements containing text
 *   npx tsx compiler/inspect.ts get <id> [prop]          — get element property
 *   npx tsx compiler/inspect.ts --app dashboard tree     — target a specific running app
 */

import * as net from 'node:net'
import * as fs from 'node:fs'
import * as path from 'node:path'

function resolveSocket(appName: string | null): string {
  if (appName && appName.length > 0) return `/tmp/strictts-inspect-${appName}.sock`

  const legacy = '/tmp/strictts-inspect.sock'
  if (fs.existsSync(legacy)) return legacy

  const tmpEntries = fs.readdirSync('/tmp')
  const sockets = tmpEntries
    .filter((entry) => entry.startsWith('strictts-inspect-') && entry.endsWith('.sock'))
    .map((entry) => path.join('/tmp', entry))

  if (sockets.length === 1) return sockets[0]
  if (sockets.length > 1) {
    const names = sockets.map((sock) => path.basename(sock, '.sock').replace('strictts-inspect-', '')).join(', ')
    console.error(`Multiple running StrictTS apps found. Use --app <name>. Available: ${names}`)
    process.exit(1)
  }

  return legacy
}

const rawArgs = process.argv.slice(2)
let appName: string | null = null
const args: string[] = []
let i = 0
while (i < rawArgs.length) {
  const arg = rawArgs[i]
  if (arg === '--app') {
    appName = rawArgs[i + 1] ?? null
    i += 2
    continue
  }
  args.push(arg)
  i += 1
}

const SOCK = resolveSocket(appName)
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
