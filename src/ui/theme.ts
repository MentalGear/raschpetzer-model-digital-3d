import { create } from 'zustand'

export type Theme = 'light' | 'dark'

const KEY = 'vitrine:theme'
const WOOD_KEY = 'vitrine:woodBrightness'
const PEOPLE_KEY = 'vitrine:people'

const has = typeof localStorage !== 'undefined'

function initialTheme(): Theme {
  const saved = (has && localStorage.getItem(KEY)) as Theme | null
  if (saved === 'light' || saved === 'dark') return saved
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

function initialWood(): number {
  const raw = has ? localStorage.getItem(WOOD_KEY) : null
  const n = raw ? parseFloat(raw) : NaN
  return Number.isFinite(n) ? n : 1
}

export const WOOD_BRIGHTNESS_MIN = 0.4
export const WOOD_BRIGHTNESS_MAX = 1.6

interface ThemeState {
  theme: Theme
  /** Multiplier applied to the wood material colour (0.4 = dark, 1.6 = bright). */
  woodBrightness: number
  /** Show human silhouette cutouts in front of the showcase for real-life scale. */
  showPeople: boolean
  toggle: () => void
  setWoodBrightness: (v: number) => void
  togglePeople: () => void
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: initialTheme(),
  woodBrightness: initialWood(),
  showPeople: has ? localStorage.getItem(PEOPLE_KEY) === '1' : false,
  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    if (has) localStorage.setItem(KEY, next)
    set({ theme: next })
  },
  setWoodBrightness: (v) => {
    const clamped = Math.min(WOOD_BRIGHTNESS_MAX, Math.max(WOOD_BRIGHTNESS_MIN, v))
    if (has) localStorage.setItem(WOOD_KEY, String(clamped))
    set({ woodBrightness: clamped })
  },
  togglePeople: () => {
    const next = !get().showPeople
    if (has) localStorage.setItem(PEOPLE_KEY, next ? '1' : '0')
    set({ showPeople: next })
  },
}))

/** Canvas clear colour per theme. */
export const canvasBg: Record<Theme, string> = {
  light: '#eef1f4',
  dark: '#161a22',
}
