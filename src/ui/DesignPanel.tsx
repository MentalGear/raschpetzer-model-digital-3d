import { findSegment, useStore } from '../state/store'
import { mToCm, cmToM } from '../state/units'
import { NumberField } from './NumberField'

export function DesignPanel() {
  const segments = useStore((s) => s.layout.segments)
  const selected = useStore((s) => s.selected)
  const select = useStore((s) => s.select)
  const layout = useStore((s) => s.layout)
  const addSegment = useStore((s) => s.addSegment)
  const removeSegment = useStore((s) => s.removeSegment)
  const resizeSegment = useStore((s) => s.resizeSegment)
  const addShelf = useStore((s) => s.addShelf)
  const removeShelf = useStore((s) => s.removeShelf)
  const setShelfHeight = useStore((s) => s.setShelfHeight)

  const seg = selected?.kind === 'segment' ? findSegment(layout, selected.id) : undefined

  return (
    <div className="panel">
      <h2>Cabinet design</h2>
      <p className="hint">Click a cabinet in the scene to edit it. Resize values update the live dimension arrows.</p>

      <div className="seg-list">
        {segments.map((s, i) => (
          <button
            key={s.id}
            className={`seg-chip ${selected?.id === s.id ? 'active' : ''}`}
            onClick={() => select({ kind: 'segment', id: s.id })}
          >
            Cabinet {i + 1}
          </button>
        ))}
        <button className="add" onClick={addSegment}>
          + Add cabinet
        </button>
      </div>

      {seg ? (
        <div className="seg-editor">
          <h3>Dimensions</h3>
          <NumberField label="Width" value={seg.width} onChange={(m) => resizeSegment(seg.id, { width: m })} />
          <NumberField label="Height" value={seg.height} onChange={(m) => resizeSegment(seg.id, { height: m })} />
          <NumberField label="Depth" value={seg.depth} onChange={(m) => resizeSegment(seg.id, { depth: m })} />

          <h3>Glass shelves</h3>
          <div className="shelf-list">
            {seg.shelves.map((sh, i) => (
              <div key={sh.id} className="shelf-row">
                <span className="shelf-name">Shelf {i + 1}</span>
                <input
                  type="range"
                  min={0}
                  max={Number(mToCm(seg.height).toFixed(0))}
                  step={0.5}
                  value={Number(mToCm(sh.height).toFixed(1))}
                  onChange={(e) => setShelfHeight(seg.id, sh.id, cmToM(parseFloat(e.target.value)))}
                />
                <input
                  type="number"
                  className="shelf-cm"
                  min={0}
                  max={Number(mToCm(seg.height).toFixed(0))}
                  step={0.5}
                  value={Number(mToCm(sh.height).toFixed(1))}
                  onChange={(e) => {
                    const cm = parseFloat(e.target.value)
                    if (!Number.isNaN(cm)) setShelfHeight(seg.id, sh.id, cmToM(cm))
                  }}
                />
                <span className="unit">cm</span>
                <button className="icon danger" title="Remove shelf" onClick={() => removeShelf(seg.id, sh.id)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button className="add" onClick={() => addShelf(seg.id)}>
            + Add shelf
          </button>

          <button className="danger block" onClick={() => removeSegment(seg.id)}>
            Delete cabinet
          </button>
        </div>
      ) : (
        <p className="hint muted">No cabinet selected.</p>
      )}
    </div>
  )
}
