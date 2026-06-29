import { create } from 'zustand'

export type Theme = 'light' | 'dark'

const KEY = 'vitrine:theme'
const PEOPLE_KEY = 'vitrine:people'

const has = typeof localStorage !== 'undefined'

function initialTheme(): Theme {
  const saved = (has && localStorage.getItem(KEY)) as Theme | null
  if (saved === 'light' || saved === 'dark') return saved
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

// Wood brightness now lives on the layout (per-cabinet + synced); these bounds
// are shared by the Design-panel control.
export const WOOD_BRIGHTNESS_MIN = 0.4
export const WOOD_BRIGHTNESS_MAX = 1.6

interface ThemeState {
  theme: Theme
  /** Show human silhouette cutouts in front of the showcase for real-life scale. */
  showPeople: boolean
  toggle: () => void
  togglePeople: () => void
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: initialTheme(),
  showPeople: has ? localStorage.getItem(PEOPLE_KEY) === '1' : false,
  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    if (has) localStorage.setItem(KEY, next)
    set({ theme: next })
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
