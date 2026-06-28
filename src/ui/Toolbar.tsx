import { useStore } from '../state/store'
import { PresetBar } from './PresetBar'

export function Toolbar() {
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)

  return (
    <header className="toolbar">
      <div className="brand">🏛️ Vitrine Simulator</div>

      <div className="mode-toggle" role="tablist" aria-label="Editor mode">
        <button
          role="tab"
          aria-selected={mode === 'design'}
          className={mode === 'design' ? 'active' : ''}
          onClick={() => setMode('design')}
        >
          Design shelf
        </button>
        <button
          role="tab"
          aria-selected={mode === 'place'}
          className={mode === 'place' ? 'active' : ''}
          onClick={() => setMode('place')}
        >
          Place items
        </button>
      </div>

      <PresetBar />
    </header>
  )
}
