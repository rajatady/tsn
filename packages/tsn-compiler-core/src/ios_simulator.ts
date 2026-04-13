import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

import type { AppBundleArtifact } from './artifact.js'

interface SimctlDevice {
  name: string
  udid: string
  state: string
  isAvailable?: boolean
}

interface SimctlRuntimeListing {
  devices: Record<string, SimctlDevice[]>
}

function q(value: string): string {
  return JSON.stringify(value)
}

function sanitizeAppToken(value: string): string {
  const compact = value.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
  return compact.length > 0 ? compact : 'app'
}

function inspectorPortForArtifact(artifact: AppBundleArtifact): number {
  let hash = 0
  for (const ch of artifact.bundleId) {
    hash = (hash * 33 + ch.charCodeAt(0)) >>> 0
  }
  return 43000 + (hash % 2000)
}

function inspectorRegistryPath(artifact: AppBundleArtifact): string {
  return path.join('/tmp', `tsn-inspect-${sanitizeAppToken(artifact.executableName)}.json`)
}

function writeInspectorRegistry(artifact: AppBundleArtifact, device: SimctlDevice, port: number): void {
  const payload = {
    kind: 'tcp',
    platform: 'ios',
    host: '127.0.0.1',
    port,
    deviceUdid: device.udid,
    bundleId: artifact.bundleId,
    executableName: artifact.executableName,
  }
  fs.writeFileSync(inspectorRegistryPath(artifact), JSON.stringify(payload, null, 2))
}

function listIOSDevices(): SimctlDevice[] {
  const raw = execSync('xcrun simctl list devices available -j', { encoding: 'utf8' })
  const parsed = JSON.parse(raw) as SimctlRuntimeListing
  const devices: SimctlDevice[] = []

  for (const runtime of Object.keys(parsed.devices)) {
    if (!runtime.includes('iOS')) continue
    for (const device of parsed.devices[runtime] ?? []) {
      if (device.isAvailable === false) continue
      devices.push(device)
    }
  }

  return devices
}

function resolveIOSDevice(simulatorHint: string | null): SimctlDevice {
  const devices = listIOSDevices()
  if (devices.length === 0) {
    throw new Error('No available iOS simulators were found')
  }

  if (simulatorHint) {
    const exact = devices.find(device => device.udid === simulatorHint || device.name === simulatorHint)
    if (exact) return exact

    const fuzzy = devices.find(device => device.name.toLowerCase().includes(simulatorHint.toLowerCase()))
    if (fuzzy) return fuzzy

    throw new Error(`Could not find an available iOS simulator matching "${simulatorHint}"`)
  }

  const booted = devices.find(device => device.state === 'Booted')
  if (booted) return booted

  const preferredIPhone = devices.find(device => device.name.startsWith('iPhone'))
  return preferredIPhone ?? devices[0]
}

function bootIOSDevice(device: SimctlDevice): void {
  execSync('open -a Simulator', { stdio: 'ignore' })
  if (device.state !== 'Booted') {
    execSync(`xcrun simctl boot ${q(device.udid)}`, { stdio: 'ignore' })
  }
  execSync(`xcrun simctl bootstatus ${q(device.udid)} -b`, { stdio: 'inherit' })
}

export function installAndLaunchIOSAppBundle(artifact: AppBundleArtifact, simulatorHint: string | null): void {
  const device = resolveIOSDevice(simulatorHint)
  const appPath = path.resolve(artifact.path)
  const inspectorPort = inspectorPortForArtifact(artifact)

  console.log(`Installing ${path.basename(appPath)} on ${device.name}...`)
  bootIOSDevice(device)

  try {
    execSync(`xcrun simctl terminate ${q(device.udid)} ${q(artifact.bundleId)}`, { stdio: 'ignore' })
  } catch {
    // App was not already running.
  }

  execSync(`xcrun simctl install ${q(device.udid)} ${q(appPath)}`, { stdio: 'inherit' })
  writeInspectorRegistry(artifact, device, inspectorPort)
  execSync(
    `SIMCTL_CHILD_TSN_INSPECTOR_PORT=${q(String(inspectorPort))} xcrun simctl launch --console ${q(device.udid)} ${q(artifact.bundleId)}`,
    { stdio: 'inherit' },
  )
}
