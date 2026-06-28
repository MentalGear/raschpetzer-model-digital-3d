import { create } from 'zustand'

export type Theme = 'light' | 'dark'

const KEY = 'vitrine:theme'

function initialTheme(): Theme {
  const saved = (typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) as Theme | null
  if (saved === 'light' || saved === 'dark') return saved
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

interface ThemeState {
  theme: Theme
  toggle: () => void
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: initialTheme(),
  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(KEY, next)
    set({ theme: next })
  },
}))

/** Canvas clear colour per theme. */
export const canvasBg: Record<Theme, string> = {
  light: '#eef1f4',
  dark: '#161a22',
}
