import { useState } from 'react'
import { findItem, findShelf, useStore } from '../state/store'
import type { TransformMode, Vec3 } from '../state/types'
import { PRIMITIVE_LABELS } from '../scene/primitives'
import { mToCm } from '../state/units'
import { NumberField } from './NumberField'

const MODES: { key: TransformMode; label: string }[] = [
  { key: 'translate', label: 'Move' },
  { key: 'rotate', label: 'Rotate' },
  { key: 'scale', label: 'Resize' },
]

const COLOR_PRESETS = ['#ffffff', '#222222', '#c9a14a', '#b5532a', '#2e6f4e', '#3a6ea5']

/** Colour swatch + editable hex field + preset chips. Local draft keeps the hex
 *  input editable while only committing valid #rrggbb values. */
function ColorControl({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [draft, setDraft] = useState(color)
  return (
    <>
      <div className="color-row">
        <input
          type="color"
          className="color-input"
          aria-label="Item colour swatch"
          value={color}
          onChange={(e) => {
            setDraft(e.target.value)
            onChange(e.target.value)
          }}
        />
        <input
          type="text"
          className="color-hex"
          aria-label="Item colour hex value"
          spellCheck={false}
          value={draft}
          onChange={(e) => {
            const v = e.target.value
            setDraft(v)
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v)
          }}
        />
      </div>
      <div className="color-presets">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            className={`color-chip${color.toLowerCase() === c ? ' active' : ''}`}
            style={{ background: c }}
            title={c}
            aria-label={`Set colour ${c}`}
            onClick={() => {
              setDraft(c)
              onChange(c)
            }}
          />
        ))}
      </div>
    </>
  )
}

export function PropertiesPanel() {
  const selected = useStore((s) => s.selected)
  const layout = useStore((s) => s.layout)
  const transformMode = useStore((s) => s.transformMode)
  const setTransformMode = useStore((s) => s.setTransformMode)
  const resizeItem = useStore((s) => s.resizeItem)
  const rotateItem = useStore((s) => s.rotateItem)
  const tiltItem = useStore((s) => s.tiltItem)
  const setItemAttached = useStore((s) => s.setItemAttached)
  const setItemColor = useStore((s) => s.setItemColor)
  const removeItem = useStore((s) => s.removeItem)

  if (selected?.kind === 'shelf') {
    return <ShelfProperties shelfId={selected.id} />
  }

  const item = selected?.kind === 'item' ? findItem(layout, selected.id) : undefined
  if (!item) {
    return (
      <div className="panel">
        <h2>Properties</h2>
        <p className="hint muted">Select an item to edit it, or a shelf to move it.</p>
      </div>
    )
  }

  const setSize = (axis: 0 | 1 | 2, m: number) => {
    const next: Vec3 = [...item.size] as Vec3
    next[axis] = m
    resizeItem(item.id, next)
  }
  const deg = Math.round((item.rotationY * 180) / Math.PI)
  const tiltDeg = Math.round((item.rotationX * 180) / Math.PI)

  return (
    <div className="panel">
      <h2>{PRIMITIVE_LABELS[item.type]}</h2>

      <h3>Tool</h3>
      <div className="mode-toggle small">
        {MODES.map((m) => (
          <button
            key={m.key}
            className={transformMode === m.key ? 'active' : ''}
            onClick={() => setTransformMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <h3>Size</h3>
      <NumberField label="Width" value={item.size[0]} onChange={(m) => setSize(0, m)} />
      <NumberField label="Height" value={item.size[1]} onChange={(m) => setSize(1, m)} />
      <NumberField label="Depth" value={item.size[2]} onChange={(m) => setSize(2, m)} />

      <h3>Placement</h3>
      <div className="mode-toggle small" role="group" aria-label="Item placement">
        <button
          className={item.attached ? 'active' : ''}
          onClick={() => setItemAttached(item.id, true)}
          title="Rests on its shelf; follows the shelf and re-seats when tilted"
        >
          On surface
        </button>
        <button
          className={!item.attached ? 'active' : ''}
          onClick={() => setItemAttached(item.id, false)}
          title="Floats freely in space on all axes"
        >
          Fixed in space
        </button>
      </div>

      <h3>Rotation</h3>
      <label className="field">
        <span>Spin (Y)</span>
        <div className="field-input">
          <input
            type="range"
            aria-label="Rotation about the Y axis in degrees"
            min={0}
            max={360}
            step={1}
            value={(deg + 360) % 360}
            onChange={(e) => rotateItem(item.id, (parseFloat(e.target.value) * Math.PI) / 180)}
          />
          <span className="unit">{(deg + 360) % 360}°</span>
        </div>
      </label>
      <label className="field">
        <span>Tilt (X)</span>
        <div className="field-input">
          <input
            type="range"
            aria-label="Tilt about the X axis in degrees"
            min={-90}
            max={90}
            step={1}
            value={tiltDeg}
            onChange={(e) => tiltItem(item.id, (parseFloat(e.target.value) * Math.PI) / 180)}
          />
          <span className="unit">{tiltDeg}°</span>
        </div>
      </label>
      <div className="btn-row">
        <button className="mini" onClick={() => tiltItem(item.id, 0)} title="Stand upright">
          Stand up
        </button>
        <button className="mini" onClick={() => tiltItem(item.id, Math.PI / 2)} title="Lay flat on the surface">
          Lay flat
        </button>
      </div>

      <h3>Item colour</h3>
      <ColorControl key={item.id} color={item.color} onChange={(c) => setItemColor(item.id, c)} />

      <button
        className="danger block"
        onClick={() => {
          if (confirm('Delete this item?')) removeItem(item.id)
        }}
      >
        🗑 Delete item
      </button>
    </div>
  )
}

/** Shown in placement mode when a shelf is selected: adjust its height (items on
 *  it ride along) or drag the in-scene vertical gizmo. */
function ShelfProperties({ shelfId }: { shelfId: string }) {
  const layout = useStore((s) => s.layout)
  const setShelfHeight = useStore((s) => s.setShelfHeight)
  const ref = findShelf(layout, shelfId)
  if (!ref) {
    return (
      <div className="panel">
        <h2>Shelf</h2>
        <p className="hint muted">Shelf not found.</p>
      </div>
    )
  }
  const { segment, shelf } = ref
  const onShelf = layout.items.filter((it) => it.shelfId === shelf.id && it.attached).length

  return (
    <div className="panel">
      <h2>Glass shelf</h2>
      <p className="hint">Drag the vertical gizmo in the scene, or set the height here. Items resting on this shelf move with it.</p>
      <h3>Height from floor</h3>
      <NumberField
        label="Height"
        value={shelf.height}
        min={0}
        max={Number(mToCm(segment.height).toFixed(0))}
        onChange={(m) => setShelfHeight(segment.id, shelf.id, m)}
      />
      <p className="hint muted">{onShelf} item{onShelf === 1 ? '' : 's'} attached to this shelf.</p>
    </div>
  )
}
