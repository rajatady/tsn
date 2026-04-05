export function parseArbitrary(cls: string): number {
  const match = cls.match(/\[(\d+)\]/)
  return match ? parseInt(match[1]) : -1
}

export function tokenizeClassName(className: string): string[] {
  return className.split(/\s+/).filter(cls => cls.length > 0)
}
