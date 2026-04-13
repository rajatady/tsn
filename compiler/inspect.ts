/**
 * TSN Inspector CLI — query running app's view tree
 *
 * Usage:
 *   npx tsx compiler/inspect.ts tree                     — dump view hierarchy
 *   npx tsx compiler/inspect.ts screenshot               — save screenshot to /tmp
 *   npx tsx compiler/inspect.ts click <label>            — click a button
 *   npx tsx compiler/inspect.ts clickid <id>             — click a specific element
 *   npx tsx compiler/inspect.ts type <text>              — type into search field
 *   npx tsx compiler/inspect.ts typeid <id> <text>       — type into a specific input
 *   npx tsx compiler/inspect.ts find <text>              — find elements containing text
 *   npx tsx compiler/inspect.ts get <id> [prop]          — get frame/text/value/placeholder/indeterminate/rows/columns/hidden/children/flex/type
 *   npx tsx compiler/inspect.ts --app dashboard tree     — target a specific running app
 */

import * as net from 'node:net'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { execFileSync } from 'node:child_process'

type UnixInspectorEndpoint = {
  kind: 'unix'
  path: string
  name: string
}

type TcpInspectorEndpoint = {
  kind: 'tcp'
  name: string
  host: string
  port: number
  platform: 'ios'
  deviceUdid: string
  bundleId: string
  executableName: string
}

type InspectorEndpoint = UnixInspectorEndpoint | TcpInspectorEndpoint

function resolveNamedEndpoint(appName: string): InspectorEndpoint {
  const registryPath = `/tmp/tsn-inspect-${appName}.json`
  if (fs.existsSync(registryPath)) {
    const raw = JSON.parse(fs.readFileSync(registryPath, 'utf8')) as Omit<TcpInspectorEndpoint, 'name'>
    return { name: appName, ...raw }
  }
  return { kind: 'unix', path: `/tmp/tsn-inspect-${appName}.sock`, name: appName }
}

function resolveEndpoint(appName: string | null): InspectorEndpoint {
  if (appName && appName.length > 0) return resolveNamedEndpoint(appName)

  const legacy = '/tmp/tsn-inspect.sock'
  const endpoints: InspectorEndpoint[] = []
  if (fs.existsSync(legacy)) {
    endpoints.push({ kind: 'unix', path: legacy, name: 'app' })
  }

  const tmpEntries = fs.readdirSync('/tmp')
  const sockets = tmpEntries
    .filter((entry) => entry.startsWith('tsn-inspect-') && entry.endsWith('.sock'))
    .map((entry) => ({
      kind: 'unix' as const,
      path: path.join('/tmp', entry),
      name: path.basename(entry, '.sock').replace('tsn-inspect-', ''),
    }))
  const registries = tmpEntries
    .filter((entry) => entry.startsWith('tsn-inspect-') && entry.endsWith('.json'))
    .map((entry) => {
      const name = path.basename(entry, '.json').replace('tsn-inspect-', '')
      const raw = JSON.parse(fs.readFileSync(path.join('/tmp', entry), 'utf8')) as Omit<TcpInspectorEndpoint, 'name'>
      return { name, ...raw }
    })
  endpoints.push(...sockets, ...registries)

  if (endpoints.length === 1) return endpoints[0]
  if (endpoints.length > 1) {
    const names = endpoints.map((endpoint) => endpoint.name).join(', ')
    console.error(`Multiple running TSN apps found. Use --app <name>. Available: ${names}`)
    process.exit(1)
  }

  return { kind: 'unix', path: legacy, name: 'app' }
}

function takeIOSSimulatorScreenshot(endpoint: TcpInspectorEndpoint): void {
  const outputPath = '/tmp/tsn-screenshot.png'
  execFileSync('xcrun', ['simctl', 'io', endpoint.deviceUdid, 'screenshot', outputPath], { stdio: 'ignore' })
  process.stdout.write(`Screenshot saved: ${outputPath}\n`)
}

function showIOSLogs(endpoint: TcpInspectorEndpoint): void {
  const output = execFileSync(
    'xcrun',
    ['simctl', 'spawn', endpoint.deviceUdid, 'log', 'show', '--style', 'compact', '--last', '5m', '--predicate', `process == "${endpoint.executableName}"`],
    { encoding: 'utf8' },
  )
  process.stdout.write(output.length > 0 ? output : `No recent logs for ${endpoint.executableName}\n`)
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

const endpoint = resolveEndpoint(appName)
const cmd = args.join(' ') || 'help'

if (endpoint.kind === 'tcp' && cmd === 'screenshot') {
  takeIOSSimulatorScreenshot(endpoint)
  process.exit(0)
}

if (endpoint.kind === 'tcp' && cmd === 'logs') {
  showIOSLogs(endpoint)
  process.exit(0)
}

const client = net.createConnection(endpoint.kind === 'unix'
  ? { path: endpoint.path }
  : { host: endpoint.host, port: endpoint.port }, () => {
  client.write(cmd)
})

client.on('data', (data) => {
  process.stdout.write(data.toString())
  client.end()
})

client.on('error', (err: any) => {
  if (err.code === 'ENOENT' || err.code === 'ECONNREFUSED') {
    console.error('No running TSN app found. Start one with: tsn dev <file.tsx>')
  } else {
    console.error('Error:', err.message)
  }
  process.exit(1)
})

client.on('end', () => {
  process.exit(0)
})
