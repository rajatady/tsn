export const SPACING: Record<number, number> = {
  0: 0, 0.5: 2, 1: 4, 1.5: 6, 2: 8, 2.5: 10,
  3: 12, 3.5: 14, 4: 16, 5: 20, 6: 24, 7: 28,
  8: 32, 9: 36, 10: 40, 11: 44, 12: 48,
  14: 56, 16: 64, 20: 80, 24: 96, 28: 112,
  32: 128, 36: 144, 40: 160, 44: 176, 48: 192,
}

export const TEXT_SIZES: Record<string, number> = {
  xs: 12, sm: 14, base: 16, lg: 18,
  xl: 20, '2xl': 24, '3xl': 30, '4xl': 36,
  '5xl': 48, '6xl': 60,
}

export const BG_COLORS: Record<string, [number, number, number, number]> = {
  'zinc-50': [0.98, 0.98, 0.98, 1],
  'zinc-100': [0.96, 0.96, 0.96, 1],
  'zinc-200': [0.90, 0.90, 0.90, 1],
  'zinc-300': [0.83, 0.83, 0.83, 1],
  'zinc-400': [0.63, 0.63, 0.65, 1],
  'zinc-500': [0.44, 0.44, 0.46, 1],
  'zinc-600': [0.33, 0.33, 0.35, 1],
  'zinc-700': [0.24, 0.24, 0.26, 1],
  'zinc-800': [0.15, 0.15, 0.16, 1],
  'zinc-900': [0.09, 0.09, 0.10, 1],
  'zinc-950': [0.04, 0.04, 0.05, 1],
  black: [0, 0, 0, 1],
  white: [1, 1, 1, 1],
}

export const TEXT_SYSTEM_COLORS: Record<string, number> = {
  'zinc-500': 2,
  'zinc-400': 1,
  'zinc-300': 0,
  blue: 3,
  green: 4,
  red: 5,
  orange: 6,
  yellow: 7,
  purple: 8,
  pink: 9,
  teal: 10,
  indigo: 11,
  cyan: 12,
}

export function px(n: number): number {
  if (n in SPACING) return SPACING[n]
  return n * 4
}
