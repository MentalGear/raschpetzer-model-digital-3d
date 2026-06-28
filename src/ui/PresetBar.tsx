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
      <input
        className="user-input"
        placeholder="Your name"
        value={user}
        onChange={(e) => setUser(e.target.value)}
        title="Saved with each preset"
      />
      <input
        className="preset-name"
        placeholder="Preset name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSave()}
      />
      <button onClick={onSave}>Save</button>
      <select value={selected} onChange={(e) => setSelected(e.target.value)}>
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
  )
}
