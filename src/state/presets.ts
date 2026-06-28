import type { Layout } from './types'

// Named presets are stored separately from the autosaved working draft.
// Index:   vitrine:presets        -> PresetMeta[]
// Payload: vitrine:preset:<name>  -> Layout JSON

const INDEX_KEY = 'vitrine:presets'
const payloadKey = (name: string) => `vitrine:preset:${name}`

export interface PresetMeta {
  name: string
  user: string
  savedAt: number
}

export function listPresets(): PresetMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PresetMeta[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeIndex(metas: PresetMeta[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(metas))
}

export function savePreset(name: string, user: string, layout: Layout): PresetMeta {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Preset name is required')
  const meta: PresetMeta = { name: trimmed, user: user.trim(), savedAt: Date.now() }
  localStorage.setItem(payloadKey(trimmed), JSON.stringify(layout))
  const others = listPresets().filter((m) => m.name !== trimmed)
  writeIndex([...others, meta].sort((a, b) => b.savedAt - a.savedAt))
  return meta
}

export function loadPreset(name: string): Layout | null {
  try {
    const raw = localStorage.getItem(payloadKey(name))
    if (!raw) return null
    return JSON.parse(raw) as Layout
  } catch {
    return null
  }
}

export function deletePreset(name: string): void {
  localStorage.removeItem(payloadKey(name))
  writeIndex(listPresets().filter((m) => m.name !== name))
}
