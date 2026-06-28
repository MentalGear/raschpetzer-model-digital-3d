import { useEffect, useState } from 'react'
import { useStore } from '../state/store'
import {
  deletePreset,
  listPresets,
  loadPreset,
  savePreset,
  type PresetMeta,
} from '../state/presets'

const USER_KEY = 'vitrine:user'

export function PresetBar() {
  const layout = useStore((s) => s.layout)
  const loadLayout = useStore((s) => s.loadLayout)

  const [user, setUser] = useState(() => localStorage.getItem(USER_KEY) ?? '')
  const [name, setName] = useState('')
  const [presets, setPresets] = useState<PresetMeta[]>([])
  const [selected, setSelected] = useState('')
  const [justSaved, setJustSaved] = useState(false)

  const refresh = () => setPresets(listPresets())
  useEffect(refresh, [])

  useEffect(() => {
    localStorage.setItem(USER_KEY, user)
  }, [user])

  const onSave = () => {
    const presetName = name.trim() || selected
    if (!presetName) {
      alert('Enter a preset name to save.')
      return
    }
    savePreset(presetName, user, layout)
    setName('')
    setSelected(presetName)
    refresh()
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1600)
  }

  const onLoad = () => {
    if (!selected) return
    const loaded = loadPreset(selected)
    if (loaded) loadLayout(loaded)
    else alert(`Preset "${selected}" could not be loaded.`)
  }

  const onDelete = () => {
    if (!selected) return
    if (!confirm(`Delete preset "${selected}"?`)) return
    deletePreset(selected)
    setSelected('')
    refresh()
  }

  return (
    <div className="preset-bar">
      <label className="name-field" title="Saved with each preset">
        <span className="name-icon" aria-hidden>
          👤
        </span>
        <input
          className="user-input"
          placeholder="Your name"
          aria-label="Your name (saved with each preset)"
          value={user}
          onChange={(e) => setUser(e.target.value)}
        />
      </label>

      <span className="sep" />

      <div className="preset-group">
        <input
          className="preset-name"
          placeholder="Preset name"
          aria-label="Preset name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
        />
        <button onClick={onSave} className={justSaved ? 'saved' : ''}>
          {justSaved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      <span className="sep" />

      <div className="preset-group">
        <select
          className="select-styled"
          aria-label="Load a saved preset"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">— load preset —</option>
          {presets.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
              {p.user ? ` · ${p.user}` : ''}
            </option>
          ))}
        </select>
        <button onClick={onLoad} disabled={!selected}>
          Load
        </button>
        <button onClick={onDelete} disabled={!selected} className="danger">
          Delete
        </button>
      </div>
    </div>
  )
}
