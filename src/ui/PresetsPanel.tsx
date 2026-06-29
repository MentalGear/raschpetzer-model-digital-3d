import { useEffect, useState } from 'react'
import { useStore } from '../state/store'
import { clearHistory } from '../state/historyStore'
import {
  deletePreset,
  listPresets,
  loadPreset,
  savePreset,
  type PresetMeta,
} from '../state/presets'

const USER_KEY = 'vitrine:user'

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export function PresetsPanel() {
  const layout = useStore((s) => s.layout)
  const loadLayout = useStore((s) => s.loadLayout)

  const [user, setUser] = useState(() => localStorage.getItem(USER_KEY) ?? '')
  const [name, setName] = useState('')
  const [presets, setPresets] = useState<PresetMeta[]>([])
  const [justSaved, setJustSaved] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const refresh = () => setPresets(listPresets())
  useEffect(refresh, [])
  useEffect(() => {
    localStorage.setItem(USER_KEY, user)
  }, [user])

  const onSave = () => {
    const presetName = name.trim()
    if (!presetName) return
    savePreset(presetName, user, layout)
    refresh()
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2200)
  }

  const onDelete = (presetName: string) => {
    deletePreset(presetName)
    setPendingDelete(null)
    refresh()
  }

  return (
    <div className="panel">
      <h2>Presets</h2>
      <p className="hint">Save the current layout (cabinets, shelves, items) and reload it anytime.</p>

      <h3>Author</h3>
      <label className="field">
        <span>By</span>
        <input
          className="full-input"
          placeholder="Your name"
          aria-label="Your name (saved with each preset)"
          value={user}
          onChange={(e) => setUser(e.target.value)}
        />
      </label>

      <h3>Save current layout</h3>
      <input
        className="full-input"
        placeholder="Preset name"
        aria-label="Preset name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSave()}
      />
      <button className={`primary block-btn${justSaved ? ' saved' : ''}`} onClick={onSave} disabled={!name.trim()}>
        {justSaved ? '✓ Saved' : 'Save preset'}
      </button>

      <h3>Saved presets</h3>
      {presets.length === 0 ? (
        <p className="hint muted">No saved presets yet. Name and save your current layout above.</p>
      ) : (
        <ul className="preset-list">
          {presets.map((p) => (
            <li key={p.name} className="preset-item">
              {pendingDelete === p.name ? (
                <div className="preset-confirm">
                  <span>Delete “{p.name}”?</span>
                  <div className="preset-actions">
                    <button className="mini" onClick={() => setPendingDelete(null)}>
                      Cancel
                    </button>
                    <button className="mini danger-fill" onClick={() => onDelete(p.name)}>
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="preset-meta">
                    <span className="preset-title">{p.name}</span>
                    <span className="preset-sub">
                      {[p.user, formatDate(p.savedAt)].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <div className="preset-actions">
                    <button
                      className="mini"
                      onClick={() => {
                        const l = loadPreset(p.name)
                        if (l) { loadLayout(l); clearHistory() }
                      }}
                    >
                      Load
                    </button>
                    <button
                      className="icon danger"
                      title="Delete preset"
                      onClick={() => setPendingDelete(p.name)}
                    >
                      ✕
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
