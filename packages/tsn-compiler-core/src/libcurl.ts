import { execSync } from 'node:child_process'

export interface LibcurlFlags {
  cflags: string[]
  libs: string[]
}

function splitFlags(raw: string): string[] {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

export function getLibcurlFlags(): LibcurlFlags {
  try {
    const cflags = splitFlags(execSync('curl-config --cflags', { encoding: 'utf8' }))
    const libs = splitFlags(execSync('curl-config --libs', { encoding: 'utf8' }))
    return { cflags, libs }
  } catch {
    throw new Error('libcurl is required for hosted fetch support; install curl development headers so curl-config is available')
  }
}

export function getLibcurlShellFlags(): string {
  const { cflags, libs } = getLibcurlFlags()
  return [...cflags, ...libs].join(' ')
}
