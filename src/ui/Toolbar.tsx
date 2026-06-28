import { useStore } from '../state/store'
import { PresetBar } from './PresetBar'
import { useTheme } from './theme'

export function Toolbar() {
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  const theme = useTheme((s) => s.theme)
  const toggleTheme = useTheme((s) => s.toggle)

  return (
    <header className="toolbar">
      <div className="brand">🏛️ Vitrine Simulator</div>

      <div className="mode-toggle" role="tablist" aria-label="Editor mode">
        <button
          role="tab"
          aria-selected={mode === 'design'}
          className={mode === 'design' ? 'active' : ''}
          onClick={() => setMode('design')}
          title="Design mode (shortcut: D)"
        >
          Design shelf
        </button>
        <button
          role="tab"
          aria-selected={mode === 'place'}
          className={mode === 'place' ? 'active' : ''}
          onClick={() => setMode('place')}
          title="Placement mode (shortcut: P)"
        >
          Place items
        </button>
      </div>

      <PresetBar />

      <button
        className="theme-toggle"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle colour theme"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </header>
  )
}
