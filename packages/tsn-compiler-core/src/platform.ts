/**
 * StrictTS Platform Abstraction
 *
 * Each platform is a HostPlatform object that provides compiler flags,
 * host source paths, and capability declarations. The compiler calls
 * resolveHostPlatform() once and uses the returned contract everywhere.
 *
 * To add a new platform:
 *   1. Create a new HostPlatform object (like `linux` below)
 *   2. Add it to the platforms map
 *   3. Create a tsn-host-<name> package with the C implementation
 */

import * as os from 'node:os'
import * as path from 'node:path'

// ─── Contract ────────────────────────────────────────────────────────

export interface HostPlatform {
  readonly name: string

  /** Compiler flags for UI (JSX) targets */
  uiClangFlags(opts: { debug: boolean; cPath: string; binaryPath: string }): string

  /** Compiler flags for CLI (non-UI) targets */
  cliClangFlags(opts: { debug: boolean; cPath: string; binaryPath: string }): string

  /** Path to the host UI implementation source (e.g. ui.m on macOS) — null if UI not supported */
  readonly uiSourcePath: string | null

  /** Include path for the host UI headers — null if UI not supported */
  readonly uiHeaderRoot: string | null

  /** Whether this platform supports native UI (JSX) targets */
  readonly supportsUi: boolean
}

// ─── Shared helpers ──────────────────────────────────────────────────

function optFlag(debug: boolean): string {
  return debug ? '-O0 -g -DSTRICTTS_DEBUG' : '-O2'
}

const runtimeDir = path.join('compiler', 'runtime')

// ─── macOS (AppKit) ──────────────────────────────────────────────────

const darwinPlatform: HostPlatform = {
  name: 'darwin',
  supportsUi: true,

  uiHeaderRoot: path.join('packages', 'tsn-host-appkit', 'src'),
  uiSourcePath: path.join('packages', 'tsn-host-appkit', 'src', 'ui.m'),

  uiClangFlags({ debug, cPath, binaryPath }) {
    const uiSrc = this.uiSourcePath!
    const uiInc = this.uiHeaderRoot!
    return (
      `clang ${optFlag(debug)} -fobjc-arc -framework Cocoa -framework QuartzCore ` +
      `${cPath} ${uiSrc} -I ${uiInc} -I ${runtimeDir} -o ${binaryPath}`
    )
  },

  cliClangFlags({ debug, cPath, binaryPath }) {
    return `clang ${optFlag(debug)} -o ${binaryPath} ${cPath} -lm -I ${runtimeDir}`
  },
}

// ─── Linux ───────────────────────────────────────────────────────────

const linuxPlatform: HostPlatform = {
  name: 'linux',
  supportsUi: false,        // no native UI host yet
  uiHeaderRoot: null,
  uiSourcePath: null,

  uiClangFlags() {
    throw new Error(
      'Native UI (JSX) targets are not yet supported on Linux.\n' +
      'CLI targets (.ts) work. UI targets (.tsx) require a host implementation.\n' +
      'Contribute one at packages/tsn-host-linux/'
    )
  },

  cliClangFlags({ debug, cPath, binaryPath }) {
    return `clang ${optFlag(debug)} -o ${binaryPath} ${cPath} -lm -I ${runtimeDir}`
  },
}

// ─── Platform registry ──────────────────────────────────────────────

const platforms: Record<string, HostPlatform> = {
  darwin: darwinPlatform,
  linux: linuxPlatform,
}

/**
 * Resolve the host platform for the current OS.
 * Called once at build time — the returned object drives all
 * platform-specific decisions in the compiler.
 */
export function resolveHostPlatform(): HostPlatform {
  const key = os.platform()
  const platform = platforms[key]
  if (!platform) {
    throw new Error(
      `Unsupported platform: ${key}\n` +
      `StrictTS supports: ${Object.keys(platforms).join(', ')}`
    )
  }
  return platform
}
