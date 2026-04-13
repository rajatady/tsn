import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'

import type { UIHostTarget } from '../../tsn-compiler-ui/src/host_target.js'
import type { AppBundleArtifact } from './artifact.js'
import { listYogaSources } from './yoga.js'

function q(value: string): string {
  return JSON.stringify(value)
}

function sanitizeBundleToken(value: string): string {
  const compact = value.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
  return compact.length > 0 ? compact : 'app'
}

function humanizeProductName(value: string): string {
  const words = value
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return 'TSN App'
  return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function ensureParentDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function copyRecursive(sourcePath: string, destPath: string): void {
  const stat = fs.statSync(sourcePath)
  if (stat.isDirectory()) {
    fs.mkdirSync(destPath, { recursive: true })
    for (const entry of fs.readdirSync(sourcePath)) {
      copyRecursive(path.join(sourcePath, entry), path.join(destPath, entry))
    }
    return
  }

  ensureParentDir(destPath)
  fs.copyFileSync(sourcePath, destPath)
}

function collectBundleResourceDirs(projectRoot: string, cCode: string): string[] {
  const matches = [...cCode.matchAll(/str_lit\("([^"]+\/)"\)/g)]
  const dirs = new Set<string>()
  for (const match of matches) {
    const relative = match[1]
    const absolute = path.resolve(projectRoot, relative)
    if (!fs.existsSync(absolute)) continue
    if (!fs.statSync(absolute).isDirectory()) continue
    dirs.add(relative)
  }
  return [...dirs]
}

function collectBundleResourceFiles(projectRoot: string, cCode: string): string[] {
  const matches = [...cCode.matchAll(/str_lit\("([^"]+\.(?:png|jpg|jpeg|gif|webp|svg))"\)/g)]
  const files = new Set<string>()
  for (const match of matches) {
    const relative = match[1]
    const absolute = path.resolve(projectRoot, relative)
    if (!fs.existsSync(absolute)) continue
    if (!fs.statSync(absolute).isFile()) continue
    files.add(relative)
  }
  return [...files]
}

function copyBundleResources(projectRoot: string, cCode: string, appDir: string): void {
  const resourceDirs = collectBundleResourceDirs(projectRoot, cCode)
  for (const relativeDir of resourceDirs) {
    copyRecursive(path.resolve(projectRoot, relativeDir), path.join(appDir, relativeDir))
  }

  const resourceFiles = collectBundleResourceFiles(projectRoot, cCode)
  for (const relativeFile of resourceFiles) {
    copyRecursive(path.resolve(projectRoot, relativeFile), path.join(appDir, relativeFile))
  }
}

function writeInfoPlist(appDir: string, executableName: string, bundleId: string, displayName: string): void {
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>en</string>
  <key>CFBundleExecutable</key><string>${executableName}</string>
  <key>CFBundleIdentifier</key><string>${bundleId}</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>${displayName}</string>
  <key>CFBundleDisplayName</key><string>${displayName}</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSRequiresIPhoneOS</key><true/>
  <key>UIDeviceFamily</key>
  <array>
    <integer>1</integer>
  </array>
  <key>UILaunchScreen</key>
  <dict>
    <key>UIColorName</key><string>systemBackgroundColor</string>
  </dict>
  <key>UIApplicationSceneManifest</key>
  <dict>
    <key>UIApplicationSupportsMultipleScenes</key><false/>
  </dict>
  <key>UISupportedInterfaceOrientations</key>
  <array>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
  </array>
</dict>
</plist>
`

  fs.writeFileSync(path.join(appDir, 'Info.plist'), plist)
}

function ensureIOSSimulatorYogaArchive(
  projectRoot: string,
  clangxxPath: string,
  sdkPath: string,
): string {
  const buildRoot = path.join(projectRoot, 'build')
  const archivePath = path.join(buildRoot, 'libyoga-ios-sim.a')
  const yogaRoot = path.join(projectRoot, 'vendor', 'yoga')
  const sources = listYogaSources(projectRoot)
  const objectRoot = path.join(buildRoot, 'yoga-ios-sim-obj')

  fs.mkdirSync(objectRoot, { recursive: true })

  for (const source of sources) {
    const relative = path.relative(yogaRoot, source).replace(/\.cpp$/, '.o')
    const objectPath = path.join(objectRoot, relative)
    fs.mkdirSync(path.dirname(objectPath), { recursive: true })
    execSync(
      [
        q(clangxxPath),
        '-std=c++20',
        '-O2',
        '-c',
        '-isysroot', q(sdkPath),
        '-mios-simulator-version-min=16.0',
        '-arch', 'arm64',
        q(source),
        '-I', q(path.resolve(projectRoot, 'vendor')),
        '-o', q(objectPath),
      ].join(' '),
      { stdio: 'inherit' },
    )
  }

  const objectFiles = fs.readdirSync(objectRoot, { recursive: true })
    .filter(entry => typeof entry === 'string' && entry.endsWith('.o'))
    .map(entry => path.join(objectRoot, entry))

  execSync(
    `libtool -static -o ${q(archivePath)} ${objectFiles.map(file => q(file)).join(' ')}`,
    { stdio: 'inherit' },
  )

  return archivePath
}

export function buildIOSSimulatorBundle(
  baseName: string,
  cPath: string,
  cCode: string,
  uiHostTarget: UIHostTarget,
  isDebug: boolean,
  projectRoot = process.cwd(),
): AppBundleArtifact {
  const buildRoot = path.join(projectRoot, 'build')
  const bundleToken = sanitizeBundleToken(baseName)
  const executableName = bundleToken
  const bundleId = `com.tsn.${bundleToken}`
  const appDir = path.join(buildRoot, `${baseName}.app`)
  const binaryPath = path.join(appDir, executableName)
  const displayName = humanizeProductName(baseName)
  const sdkPath = execSync('xcrun --sdk iphonesimulator --show-sdk-path', { encoding: 'utf8' }).trim()
  const clangPath = execSync('xcrun --sdk iphonesimulator --find clang', { encoding: 'utf8' }).trim()
  const clangxxPath = execSync('xcrun --sdk iphonesimulator --find clang++', { encoding: 'utf8' }).trim()
  const optFlags = isDebug ? ['-O0', '-g', '-DTSN_DEBUG'] : ['-O2']
  const frameworkFlags = [...uiHostTarget.frameworkFlags, '-framework Foundation']
  const yogaArchive = ensureIOSSimulatorYogaArchive(projectRoot, clangxxPath, sdkPath)
  const compileArgs = [
    q(clangPath),
    ...optFlags,
    '-fobjc-arc',
    '-DTSN_RUNTIME_DISABLE_HOSTED_IO',
    '-isysroot', q(sdkPath),
    '-mios-simulator-version-min=16.0',
    '-arch', 'arm64',
    ...frameworkFlags,
    q(path.resolve(projectRoot, cPath)),
    q(path.resolve(projectRoot, uiHostTarget.runtimeSource)),
    q(yogaArchive),
    '-I', q(path.resolve(projectRoot, uiHostTarget.runtimeRoot)),
    '-I', q(path.resolve(projectRoot, 'compiler/runtime')),
    '-I', q(path.resolve(projectRoot, 'vendor')),
    '-lc++',
    '-o', q(binaryPath),
  ]

  fs.rmSync(appDir, { recursive: true, force: true })
  fs.mkdirSync(appDir, { recursive: true })
  copyBundleResources(projectRoot, cCode, appDir)
  writeInfoPlist(appDir, executableName, bundleId, displayName)

  execSync(compileArgs.join(' '), { stdio: 'inherit' })

  return {
    kind: 'app-bundle',
    platform: 'ios',
    path: appDir,
    bundleId,
    executableName,
  }
}
