import type { TSNTargetPlatform } from '../../tsn-compiler-ui/src/host_target.js'

export interface ParsedCompilerArgs {
  passthroughArgv: string[]
  platform: TSNTargetPlatform
  debug: boolean
  simulator: string | null
}

export function parseCompilerArgs(argv: string[]): ParsedCompilerArgs {
  let platform: TSNTargetPlatform = 'macos'
  let simulator: string | null = null
  const passthroughArgv: string[] = []

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--platform') {
      const next = argv[i + 1]
      if (next !== 'macos' && next !== 'ios') {
        throw new Error(`Unsupported platform "${next ?? ''}" — expected "macos" or "ios"`)
      }
      platform = next
      i += 1
      continue
    }

    if (arg === '--simulator') {
      const next = argv[i + 1]
      if (!next || next.startsWith('-')) {
        throw new Error('Missing simulator name after --simulator')
      }
      simulator = next
      i += 1
      continue
    }

    passthroughArgv.push(arg)
  }

  return {
    passthroughArgv,
    platform,
    debug: passthroughArgv.includes('--debug') || passthroughArgv.includes('-g'),
    simulator,
  }
}
