import { useStore } from '../state/store'
import { PresetBar } from './PresetBar'
import { useTheme, WOOD_BRIGHTNESS_MAX, WOOD_BRIGHTNESS_MIN } from './theme'

export function Toolbar() {
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  const theme = useTheme((s) => s.theme)
  const toggleTheme = useTheme((s) => s.toggle)
  const woodBrightness = useTheme((s) => s.woodBrightness)
  const setWoodBrightness = useTheme((s) => s.setWoodBrightness)

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

      <label className="wood-control" title="Wood brightness — lightens or darkens the cabinet wood">
        <span className="wood-icon" aria-hidden>
          🪵
        </span>
        <span className="wood-text">Wood</span>
        <input
          type="range"
          aria-label="Wood brightness"
          min={WOOD_BRIGHTNESS_MIN}
          max={WOOD_BRIGHTNESS_MAX}
          step={0.05}
          value={woodBrightness}
          onChange={(e) => setWoodBrightness(parseFloat(e.target.value))}
        />
        <output className="wood-value">{Math.round(woodBrightness * 100)}%</output>
      </label>

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
