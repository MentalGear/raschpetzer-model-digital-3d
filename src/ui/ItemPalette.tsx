import { useRef } from 'react'
import type { ItemType } from '../state/types'
import { PRIMITIVE_LABELS, PRIMITIVE_TYPES } from '../scene/primitives'
import { findItem, useStore } from '../state/store'
import { useImageStore } from '../state/imageStore'
import { ITEM_DND_MIME, encodeDnd } from './dnd'

const ICON: Record<string, string> = {
  box: '◼',
  cylinder: '⬮',
  sphere: '●',
  cone: '▲',
  torus: '◯',
  label: 'Aa',
}

export function ItemPalette() {
  const activeType = useStore((s) =>
    s.selected?.kind === 'item' ? findItem(s.layout, s.selected.id)?.type : undefined,
  )
  const images = useImageStore((s) => s.images)
  const addImage = useImageStore((s) => s.addImage)
  const removeImage = useImageStore((s) => s.removeImage)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataURL = ev.target?.result as string
      if (dataURL) addImage(dataURL)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const onDragStart = (e: React.DragEvent, type: ItemType, imageId?: string) => {
    e.dataTransfer.setData(ITEM_DND_MIME, encodeDnd(type, imageId))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="panel">
      <h2>Items</h2>
      <p className="hint">Drag onto a shelf. Arrow keys nudge selected item (Shift = 10 cm).</p>

      <div className="palette-grid">
        {PRIMITIVE_TYPES.map((type) => (
          <div
            key={type}
            className={`palette-tile${activeType === type ? ' active' : ''}`}
            draggable
            onDragStart={(e) => onDragStart(e, type)}
            title={`Drag ${PRIMITIVE_LABELS[type]} onto a shelf`}
          >
            <span className="palette-tile-icon">{ICON[type]}</span>
            <span className="palette-tile-label">{PRIMITIVE_LABELS[type]}</span>
          </div>
        ))}

        {Object.entries(images).map(([id, url]) => (
          <div
            key={id}
            className={`palette-tile palette-img-tile${activeType === 'image' ? ' active' : ''}`}
            draggable
            onDragStart={(e) => onDragStart(e, 'image', id)}
            title="Drag image onto a shelf"
          >
            <img src={url} alt="uploaded" draggable={false} />
            <button
              className="palette-img-del"
              onClick={(e) => {
                e.stopPropagation()
                removeImage(id)
              }}
              title="Remove image"
              aria-label="Remove uploaded image"
            >
              ✕
            </button>
          </div>
        ))}

        <div
          className="palette-tile palette-upload-tile"
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          title="Upload PNG, JPG, WebP or SVG"
          aria-label="Upload image"
        >
          <span className="palette-tile-icon">📷</span>
          <span className="palette-tile-label">Upload</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleUpload}
        />
      </div>
    </div>
  )
}
