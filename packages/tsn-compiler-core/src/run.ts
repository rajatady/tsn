import { execFileSync } from 'node:child_process'
import * as path from 'node:path'

import { buildTSN } from './build.js'
import { parseCompilerArgs } from './argv.js'
import { installAndLaunchIOSAppBundle } from './ios_simulator.js'

export function runTSN(inputPath: string, argv: string[] = []): void {
  const options = parseCompilerArgs(argv)
  const artifact = buildTSN(inputPath, argv)

  if (artifact.kind === 'app-bundle') {
    if (artifact.platform !== 'ios') {
      throw new Error(`Unsupported app-bundle launch platform "${artifact.platform}"`)
    }
    installAndLaunchIOSAppBundle(artifact, options.simulator)
    return
  }

  execFileSync(path.resolve(artifact.path), { stdio: 'inherit' })
}
