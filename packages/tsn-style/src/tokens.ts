export interface TypographyScale {
  xs: number
  sm: number
  base: number
  lg: number
  xl: number
  x2: number
  x3: number
  x4: number
}

export interface ThemeTokens {
  colors: Record<string, string>
  spacing: Record<string, number>
  radii: Record<string, number>
  typography: TypographyScale
  motion: Record<string, number>
}

export const defaultThemeTokens: ThemeTokens = {
  colors: {
    background: '#111111',
    panel: '#181818',
    surface: '#23201d',
    border: '#34302b',
    text: '#f4f4f4',
    muted: '#9d9893',
    accent: '#0a84ff',
    success: '#31d158',
    warning: '#ffd60a',
    destructive: '#ff453a',
  },
  spacing: {
    '0': 0,
    '1': 4,
    '2': 8,
    '3': 12,
    '4': 16,
    '5': 20,
    '6': 24,
    '8': 32,
    '10': 40,
  },
  radii: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  typography: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    x2: 24,
    x3: 30,
    x4: 36,
  },
  motion: {
    fast: 120,
    normal: 180,
    slow: 280,
  },
}
