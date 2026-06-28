import type { ItemType } from '../state/types'
import { PRIMITIVE_LABELS, PRIMITIVE_TYPES } from '../scene/primitives'
import { ITEM_DND_MIME } from './dnd'

const ICON: Record<ItemType, string> = {
  box: '◼',
  cylinder: '⬮',
  sphere: '●',
  cone: '▲',
  torus: '◯',
}

export function ItemPalette() {
  const onDragStart = (e: React.DragEvent, type: ItemType) => {
    e.dataTransfer.setData(ITEM_DND_MIME, type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="panel">
      <h2>Items</h2>
      <p className="hint">Drag a shape onto a shelf, then select it to move, rotate or resize.</p>
      <div className="palette">
        {PRIMITIVE_TYPES.map((type) => (
          <div key={type} className="palette-item" draggable onDragStart={(e) => onDragStart(e, type)}>
            <span className="palette-icon">{ICON[type]}</span>
            <span>{PRIMITIVE_LABELS[type]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
