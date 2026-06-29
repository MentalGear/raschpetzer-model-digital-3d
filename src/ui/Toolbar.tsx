import { useStore } from '../state/store'
import type { Mode } from '../state/types'
import { useTheme } from './theme'
import { undo, redo, useHistoryStore } from '../state/historyStore'

const MODES: { key: Mode; label: string; title: string; kbd?: string }[] = [
  { key: 'design', label: 'Design shelf', title: 'Design mode (shortcut: D)', kbd: 'D' },
  { key: 'place', label: 'Place items', title: 'Placement mode (shortcut: P)', kbd: 'P' },
  { key: 'presets', label: 'Presets', title: 'Saved layouts' },
]

export function Toolbar() {
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  const theme = useTheme((s) => s.theme)
  const toggleTheme = useTheme((s) => s.toggle)
  const showPeople = useTheme((s) => s.showPeople)
  const togglePeople = useTheme((s) => s.togglePeople)
  const canUndo = useHistoryStore((s) => s.canUndo)
  const canRedo = useHistoryStore((s) => s.canRedo)

  return (
    <header className="toolbar">
      <div className="brand">🏛️ Vitrine Simulator</div>

      <div className="mode-toggle" role="tablist" aria-label="Editor mode">
        {MODES.map((m) => (
          <button
            key={m.key}
            role="tab"
            aria-selected={mode === m.key}
            className={mode === m.key ? 'active' : ''}
            onClick={() => setMode(m.key)}
            title={m.title}
          >
            {m.label}
            {m.kbd && <kbd className="mode-kbd">{m.kbd}</kbd>}
          </button>
        ))}
      </div>

      <div className="undo-redo">
        <button
          className="undo-btn"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          ↩
        </button>
        <button
          className="undo-btn"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          ↪
        </button>
      </div>

      <div className="toolbar-utils">
        <button
          className={`people-toggle${showPeople ? ' active' : ''}`}
          onClick={togglePeople}
          aria-pressed={showPeople}
          title="Show human cutouts in front of the showcase for real-life scale"
        >
          🧍 People
        </button>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle colour theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}
