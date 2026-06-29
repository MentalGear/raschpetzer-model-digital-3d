import { useStore } from '../state/store'
import { DesignPanel } from './DesignPanel'
import { ItemPalette } from './ItemPalette'
import { PropertiesPanel } from './PropertiesPanel'
import { PresetsPanel } from './PresetsPanel'

export function SidePanel() {
  const mode = useStore((s) => s.mode)
  return (
    <aside className="side-panel">
      {mode === 'design' && <DesignPanel />}
      {mode === 'place' && (
        <>
          <ItemPalette />
          <PropertiesPanel />
        </>
      )}
      {mode === 'presets' && <PresetsPanel />}
    </aside>
  )
}
