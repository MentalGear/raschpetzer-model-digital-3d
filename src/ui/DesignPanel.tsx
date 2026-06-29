import { useState } from 'react'
import { compartments as getCompartments, findSegment, innerWidth, useStore } from '../state/store'
import { formatCm, mToCm, cmToM } from '../state/units'
import { WOOD_BRIGHTNESS_MAX, WOOD_BRIGHTNESS_MIN } from './theme'
import { NumberField } from './NumberField'

const GLASS_PRESETS = [
  { name: 'Clear', value: '#d4eaf5' },
  { name: 'Blue', value: '#bcdcea' },
  { name: 'Green', value: '#b8e0c0' },
  { name: 'Bronze', value: '#d4c4a4' },
  { name: 'Smoke', value: '#c0c4cc' },
]

export function DesignPanel() {
  const [pendingDeleteSeg, setPendingDeleteSeg] = useState<string | null>(null)
  const segments = useStore((s) => s.layout.segments)
  const selected = useStore((s) => s.selected)
  const select = useStore((s) => s.select)
  const layout = useStore((s) => s.layout)
  const addSegment = useStore((s) => s.addSegment)
  const removeSegment = useStore((s) => s.removeSegment)
  const resizeSegment = useStore((s) => s.resizeSegment)
  const setFrameThickness = useStore((s) => s.setFrameThickness)
  const addShelf = useStore((s) => s.addShelf)
  const removeShelf = useStore((s) => s.removeShelf)
  const setShelfHeight = useStore((s) => s.setShelfHeight)
  const setShelfMovable = useStore((s) => s.setShelfMovable)
  const setShelfHidden = useStore((s) => s.setShelfHidden)
  const addDivider = useStore((s) => s.addDivider)
  const removeDivider = useStore((s) => s.removeDivider)
  const setDividerX = useStore((s) => s.setDividerX)
  const setPanelThickness = useStore((s) => s.setPanelThickness)
  const setPanelMaterial = useStore((s) => s.setPanelMaterial)
  const setSyncedWoodBrightness = useStore((s) => s.setSyncedWoodBrightness)
  const setSegmentWoodBrightness = useStore((s) => s.setSegmentWoodBrightness)
  const setSegmentWoodLinked = useStore((s) => s.setSegmentWoodLinked)
  const syncAllWood = useStore((s) => s.syncAllWood)
  const glassOpacity = useStore((s) => s.layout.glassOpacity)
  const glassTint = useStore((s) => s.layout.glassTint)
  const setGlassOpacity = useStore((s) => s.setGlassOpacity)
  const setGlassTint = useStore((s) => s.setGlassTint)
  const groundOffset = useStore((s) => s.layout.groundOffset)
  const setGroundOffset = useStore((s) => s.setGroundOffset)

  const seg = selected?.kind === 'segment' ? findSegment(layout, selected.id) : undefined
  const anyUnlinked = segments.some((s) => s.woodBrightness !== undefined)

  return (
    <div className="panel">
      <h2>Cabinet design</h2>
      <p className="hint">Click a cabinet in the scene to edit it. Resize values update the live dimension arrows.</p>

      <h3>Scene</h3>
      <NumberField
        label="Display height off floor"
        value={groundOffset}
        min={0}
        max={200}
        onChange={setGroundOffset}
      />
      <p className="hint muted">Raises the whole showcase off the ground (e.g. on a plinth). People cutouts stay on the real floor.</p>

      <h3>Glass</h3>
      <p className="hint">Tint and opacity for all glass shelves and panels.</p>
      <div className="glass-tints">
        {GLASS_PRESETS.map((p) => (
          <button
            key={p.value}
            className={`tint-swatch${glassTint === p.value ? ' active' : ''}`}
            style={{ background: p.value }}
            title={p.name}
            aria-label={`Glass tint: ${p.name}`}
            aria-pressed={glassTint === p.value}
            onClick={() => setGlassTint(p.value)}
          />
        ))}
      </div>
      <div className="wood-row" style={{ marginTop: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 48 }}>Opacity</span>
        <input
          type="range"
          aria-label="Glass opacity"
          min={5}
          max={85}
          step={5}
          value={Math.round(glassOpacity * 100)}
          onChange={(e) => setGlassOpacity(parseFloat(e.target.value) / 100)}
        />
        <span className="unit">{Math.round(glassOpacity * 100)}%</span>
      </div>

      <div className="seg-control-row">
        <div className="seg-control" role="tablist" aria-label="Cabinet">
          {segments.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={selected?.id === s.id}
              className={`seg-tab${selected?.id === s.id ? ' active' : ''}`}
              onClick={() => select({ kind: 'segment', id: s.id })}
            >
              Cabinet {i + 1}
            </button>
          ))}
        </div>
        <button className="seg-add" onClick={addSegment} title="Add a new cabinet" aria-label="Add cabinet">
          +
        </button>
      </div>

      {seg ? (
        <div className="seg-editor">
          <h3>Dimensions</h3>
          <NumberField label="Width" value={seg.width} onChange={(m) => resizeSegment(seg.id, { width: m })} />
          <NumberField label="Height" value={seg.height} onChange={(m) => resizeSegment(seg.id, { height: m })} />
          <NumberField label="Depth" value={seg.depth} onChange={(m) => resizeSegment(seg.id, { depth: m })} />
          <NumberField
            label="Outer wall thickness"
            value={seg.frameThickness}
            min={0.5}
            max={20}
            onChange={(m) => setFrameThickness(seg.id, m)}
          />
          <p className="hint muted">
            Inner space: {formatCm(innerWidth(seg))} W × {formatCm(seg.depth - 2 * seg.frameThickness)} D
          </p>

          <h3>Wood</h3>
          {(() => {
            const linked = seg.woodBrightness === undefined
            const effective = seg.woodBrightness ?? layout.woodBrightness
            return (
              <>
                <div className="wood-row">
                  <button
                    className={`link-btn${linked ? ' on' : ''}`}
                    aria-pressed={linked}
                    title={linked ? 'Synced with all cabinets (click to set independently)' : 'Independent (click to sync with all cabinets)'}
                    onClick={() => setSegmentWoodLinked(seg.id, !linked)}
                  >
                    🔗
                  </button>
                  <input
                    type="range"
                    aria-label="Wood brightness"
                    min={WOOD_BRIGHTNESS_MIN}
                    max={WOOD_BRIGHTNESS_MAX}
                    step={0.05}
                    value={effective}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      if (linked) setSyncedWoodBrightness(v)
                      else setSegmentWoodBrightness(seg.id, v)
                    }}
                  />
                  <span className="unit">{Math.round(effective * 100)}%</span>
                </div>
                <p className="hint muted">
                  {linked ? 'Synced across all cabinets.' : 'This cabinet is independent.'}
                  {anyUnlinked && (
                    <>
                      {' '}
                      <button className="text-link" onClick={() => syncAllWood(effective)}>
                        Sync all to {Math.round(effective * 100)}%
                      </button>
                    </>
                  )}
                </p>
              </>
            )
          })()}

          <h3>Glass shelves</h3>
          <p className="hint">Height of each shelf above the cabinet floor.</p>
          {(() => {
            const comps = getCompartments(seg)
            const multi = comps.length > 1
            const maxCm = Number(mToCm(seg.height).toFixed(0))
            return comps.map((comp) => {
              const compShelves = seg.shelves.filter((sh) => (sh.compartment ?? 0) === comp.index)
              return (
                <div key={comp.index} className="compartment-group">
                  {multi && (
                    <div className="compartment-head">
                      Section {comp.index + 1} · {formatCm(comp.width)}
                    </div>
                  )}
                  <div className="shelf-list">
                    {compShelves.map((sh, n) => {
                      const label = multi ? `Section ${comp.index + 1} shelf ${n + 1}` : `Shelf ${n + 1}`
                      return (
                        <div key={sh.id} className="shelf-row">
                          <span className="shelf-name">Shelf {n + 1}</span>
                          <input
                            type="range"
                            aria-label={`${label} height in cm`}
                            min={0}
                            max={maxCm}
                            step={0.5}
                            value={Number(mToCm(sh.height).toFixed(1))}
                            onChange={(e) => setShelfHeight(seg.id, sh.id, cmToM(parseFloat(e.target.value)))}
                          />
                          <input
                            type="number"
                            className="shelf-cm"
                            aria-label={`${label} height in cm`}
                            min={0}
                            max={maxCm}
                            step={0.5}
                            value={Number(mToCm(sh.height).toFixed(1))}
                            onChange={(e) => {
                              const cm = parseFloat(e.target.value)
                              if (!Number.isNaN(cm)) setShelfHeight(seg.id, sh.id, cmToM(cm))
                            }}
                          />
                          <span className="unit">cm</span>
                          <button
                            className={`icon toggle${sh.movable ? ' on' : ''}`}
                            title={sh.movable ? 'Movable in placement mode (click to lock)' : 'Locked (click to allow moving in placement mode)'}
                            aria-pressed={sh.movable}
                            onClick={() => setShelfMovable(seg.id, sh.id, !sh.movable)}
                          >
                            {sh.movable ? '🔓↕' : '🔒'}
                          </button>
                          <button
                            className="mini icon"
                            title={sh.hidden ? 'Show shelf' : 'Hide shelf'}
                            aria-label={sh.hidden ? 'Show shelf' : 'Hide shelf'}
                            onClick={() => setShelfHidden(seg.id, sh.id, !sh.hidden)}
                            aria-pressed={sh.hidden}
                            style={{ opacity: sh.hidden ? 0.4 : 1 }}
                          >
                            {sh.hidden ? '🙈' : '👁'}
                          </button>
                          <button className="icon danger" title="Remove shelf" onClick={() => removeShelf(seg.id, sh.id)}>
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <button className="add" onClick={() => addShelf(seg.id, comp.index)}>
                    + Add shelf{multi ? ` to section ${comp.index + 1}` : ''}
                  </button>
                </div>
              )
            })
          })()}
          <p className="hint muted">🔓↕ = movable along Y in placement mode.</p>

          <h3>Separation panels</h3>
          <p className="hint">Vertical panels split the cabinet into compartments.</p>
          {(() => {
            const iw = innerWidth(seg)
            const compartments = getCompartments(seg).map((c) => c.width)
            const sorted = [...seg.dividers].sort((a, b) => a.x - b.x)
            return (
              <>
                <div className="shelf-list">
                  {sorted.map((dv, i) => {
                    const half = dv.thickness / 2
                    const prevEdge = i === 0 ? 0 : sorted[i - 1].x + sorted[i - 1].thickness / 2
                    const nextEdge = i === sorted.length - 1 ? iw : sorted[i + 1].x - sorted[i + 1].thickness / 2
                    const sliderMin = Number(mToCm(prevEdge + half).toFixed(1))
                    const sliderMax = Number(mToCm(nextEdge - half).toFixed(1))
                    return (
                    <div key={dv.id} className="shelf-row">
                      <span className="shelf-name">Panel {i + 1}</span>
                      <input
                        type="range"
                        aria-label={`Panel ${i + 1} position from left in cm`}
                        min={sliderMin}
                        max={sliderMax}
                        step={0.5}
                        value={Number(mToCm(dv.x).toFixed(1))}
                        onChange={(e) => setDividerX(seg.id, dv.id, cmToM(parseFloat(e.target.value)))}
                      />
                      <input
                        type="number"
                        className="shelf-cm"
                        aria-label={`Panel ${i + 1} position from left in cm`}
                        min={sliderMin}
                        max={sliderMax}
                        step={0.5}
                        value={Number(mToCm(dv.x).toFixed(1))}
                        onChange={(e) => {
                          const cm = parseFloat(e.target.value)
                          if (!Number.isNaN(cm)) setDividerX(seg.id, dv.id, cmToM(cm))
                        }}
                      />
                      <span className="unit">cm</span>
                      <button
                        className="icon danger"
                        title="Remove panel"
                        onClick={() => removeDivider(seg.id, dv.id)}
                      >
                        ✕
                      </button>
                    </div>
                  )
                  })}
                </div>
                <button className="add" onClick={() => addDivider(seg.id)}>
                  + Add separation panel
                </button>
                {seg.dividers.length > 0 && (
                  <>
                    <NumberField
                      label="Panel thickness"
                      value={seg.dividers[0].thickness}
                      min={0.5}
                      max={20}
                      onChange={(m) => setPanelThickness(seg.id, m)}
                    />
                    <label className="field">
                      <span>Panel material</span>
                      <div className="mode-toggle small" role="group" aria-label="Panel material">
                        <button
                          className={seg.dividers[0].material === 'wood' ? 'active' : ''}
                          onClick={() => setPanelMaterial(seg.id, 'wood')}
                        >
                          Wood
                        </button>
                        <button
                          className={seg.dividers[0].material === 'glass' ? 'active' : ''}
                          onClick={() => setPanelMaterial(seg.id, 'glass')}
                        >
                          Glass
                        </button>
                      </div>
                    </label>
                  </>
                )}
                <div className="compartments">
                  {compartments.map((c, i) => (
                    <span key={i} className="compartment-chip">
                      C{i + 1}: {formatCm(c)}
                    </span>
                  ))}
                </div>
              </>
            )
          })()}

          {pendingDeleteSeg === seg.id ? (
            <div className="inline-confirm" style={{ marginTop: 24 }}>
              <span>Delete this cabinet and all its items?</span>
              <div className="preset-actions">
                <button className="mini" onClick={() => setPendingDeleteSeg(null)}>Cancel</button>
                <button className="mini danger-fill" onClick={() => { removeSegment(seg.id); setPendingDeleteSeg(null) }}>Delete</button>
              </div>
            </div>
          ) : (
            <button className="danger block" onClick={() => setPendingDeleteSeg(seg.id)}>
              🗑 Delete cabinet
            </button>
          )}
        </div>
      ) : (
        <p className="hint muted">No cabinet selected.</p>
      )}
    </div>
  )
}
