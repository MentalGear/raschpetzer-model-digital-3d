import { useRef, useState } from 'react'
import { useStore } from '../state/store'
import type { Mode } from '../state/types'
import { GRID_PRESETS, useTheme } from './theme'
import { undo, redo, useHistoryStore } from '../state/historyStore'
import { useViewStore } from '../state/viewStore'

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
  const planView = useTheme((s) => s.planView)
  const togglePlanView = useTheme((s) => s.togglePlanView)
  const frontView = useTheme((s) => s.frontView)
  const toggleFrontView = useTheme((s) => s.toggleFrontView)
  const gridSize = useTheme((s) => s.gridSize)
  const setGridSize = useTheme((s) => s.setGridSize)
  const canUndo = useHistoryStore((s) => s.canUndo)
  const canRedo = useHistoryStore((s) => s.canRedo)
  const [gridOpen, setGridOpen] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const views = useViewStore((s) => s.views)
  const requestCapture = useViewStore((s) => s.requestCapture)
  const requestLoad = useViewStore((s) => s.requestLoad)
  const deleteView = useViewStore((s) => s.deleteView)
  const [viewsOpen, setViewsOpen] = useState(false)
  const [newViewName, setNewViewName] = useState('')

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
          className={`people-toggle${planView ? ' active' : ''}`}
          onClick={togglePlanView}
          aria-pressed={planView}
          title="Top-down plan view"
        >
          📐 Plan
        </button>
        <button
          className={`people-toggle${frontView ? ' active' : ''}`}
          onClick={toggleFrontView}
          aria-pressed={frontView}
          title="Front elevation view"
        >
          🖼 Front
        </button>
        <div className="grid-picker">
          <button
            className={`people-toggle${viewsOpen ? ' active' : ''}`}
            onClick={() => setViewsOpen((o) => !o)}
            title="Named camera views"
            aria-haspopup="true"
            aria-expanded={viewsOpen}
          >
            🎥 Views
          </button>
          {viewsOpen && (
            <div className="grid-popover views-popover" role="dialog" aria-label="Named camera views">
              <div className="views-save-row">
                <input
                  className="views-name-input"
                  type="text"
                  placeholder="View name…"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newViewName.trim()) {
                      requestCapture(newViewName.trim())
                      setNewViewName('')
                    }
                  }}
                />
                <button
                  className="mini"
                  disabled={!newViewName.trim()}
                  onClick={() => {
                    if (newViewName.trim()) {
                      requestCapture(newViewName.trim())
                      setNewViewName('')
                    }
                  }}
                >
                  Save
                </button>
              </div>
              {views.length === 0 && (
                <p className="hint muted" style={{ padding: '4px 0', margin: 0 }}>No views saved yet.</p>
              )}
              {views.map((v) => (
                <div key={v.name} className="views-row">
                  <span className="views-name">{v.name}</span>
                  <button className="mini" onClick={() => {
                    // Exit plan/front view before loading so the exit-camera effect
                    // (declared first in CameraRig) resets then the load effect wins.
                    if (planView) togglePlanView()
                    if (frontView) toggleFrontView()
                    requestLoad(v.name)
                    setViewsOpen(false)
                  }}>Go</button>
                  <button className="mini danger" onClick={() => deleteView(v.name)} title="Delete view" aria-label={`Delete view ${v.name}`}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="grid-picker" ref={gridRef}>
          <button
            className={`people-toggle${gridOpen ? ' active' : ''}`}
            onClick={() => setGridOpen((o) => !o)}
            title="Grid cell size"
            aria-haspopup="listbox"
            aria-expanded={gridOpen}
          >
            ⊞ Grid
          </button>
          {gridOpen && (
            <div className="grid-popover" role="listbox" aria-label="Grid cell size">
              {GRID_PRESETS.map((p) => (
                <button
                  key={p.value}
                  role="option"
                  aria-selected={gridSize === p.value}
                  className={`grid-option${gridSize === p.value ? ' active' : ''}`}
                  onClick={() => { setGridSize(p.value); setGridOpen(false) }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
