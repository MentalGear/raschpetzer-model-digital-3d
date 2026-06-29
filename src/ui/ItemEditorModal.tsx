import { useReducer, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, findItem } from '../state/store'
import type { Item, Vec3 } from '../state/types'
import { PrimitiveGeometry } from '../scene/primitives'
import { PRIMITIVE_LABELS } from '../scene/primitives'
import { DimensionArrows } from '../scene/DimensionArrows'
import { NumberField } from './NumberField'
import { useImageStore } from '../state/imageStore'

// ---------------------------------------------------------------------------
// History reducer
// ---------------------------------------------------------------------------

type History = { past: Item[]; present: Item; future: Item[] }

type HistAction =
  | { type: 'EDIT'; item: Item }
  | { type: 'PREVIEW'; item: Item }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET'; item: Item }

function histReducer(state: History, action: HistAction): History {
  switch (action.type) {
    case 'RESET':
      return { past: [], present: action.item, future: [] }
    case 'EDIT':
      if (JSON.stringify(action.item) === JSON.stringify(state.present)) return state
      return { past: [...state.past, state.present], present: action.item, future: [] }
    case 'UNDO':
      if (state.past.length === 0) return state
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
      }
    case 'REDO':
      if (state.future.length === 0) return state
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
      }
    case 'PREVIEW':
      return { ...state, present: action.item }
  }
}

// ---------------------------------------------------------------------------
// ColorControl
// ---------------------------------------------------------------------------

const COLOR_PRESETS = ['#ffffff', '#222222', '#c9a14a', '#b5532a', '#2e6f4e', '#3a6ea5']

function ColorControl({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [draft, setDraft] = useState(color)
  // Keep draft in sync when color changes externally (e.g. undo/redo)
  useEffect(() => { setDraft(color) }, [color])
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

// ---------------------------------------------------------------------------
// CameraUpdater — imperatively moves the camera whenever item size changes.
// R3F reads the <Canvas camera> prop only at mount, so we need this to keep
// the framing correct when the user resizes the item inside the modal.
// ---------------------------------------------------------------------------

function CameraUpdater({ camDist }: { camDist: number }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(camDist * 0.7, camDist * 0.5, camDist)
    camera.near = 0.01
    camera.far = 50
    camera.updateProjectionMatrix()
  }, [camera, camDist])
  return null
}

// ---------------------------------------------------------------------------
// ItemPreviewScene (rendered inside the mini Canvas)
// ---------------------------------------------------------------------------

function ItemPreviewScene({ item }: { item: Item }) {
  const [labelTexture, setLabelTexture] = useState<THREE.CanvasTexture | null>(null)
  useEffect(() => {
    if (item.type !== 'label') { setLabelTexture(null); return }
    const W = 512, H = 256
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#f8f5ec'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = '#c8b99a'
    ctx.lineWidth = 4
    ctx.strokeRect(8, 8, W - 16, H - 16)
    const text = item.labelText ?? ''
    const fontSize = item.labelFontSize ?? 30
    if (text) {
      ctx.fillStyle = '#1a1005'
      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const words = text.split(' ')
      const lines: string[] = []
      let cur = ''
      const maxW = W - 56
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word
        if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = word }
        else cur = test
      }
      if (cur) lines.push(cur)
      const lineH = fontSize * 1.25
      const startY = H / 2 - ((lines.length - 1) * lineH) / 2
      for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], W / 2, startY + i * lineH)
    } else {
      ctx.fillStyle = '#b0a080'
      ctx.font = 'italic 26px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Label text…', W / 2, H / 2)
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    setLabelTexture(tex)
    return () => { tex.dispose() }
  }, [item.type, item.labelText, item.labelFontSize])

  const imageDataUrl = useImageStore((s) =>
    item.type === 'image' ? (s.images[item.imageId ?? ''] ?? null) : null,
  )
  const [imageTexture, setImageTexture] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!imageDataUrl) { setImageTexture(null); return }
    const tex = new THREE.TextureLoader().load(imageDataUrl)
    tex.colorSpace = THREE.SRGBColorSpace
    setImageTexture(tex)
    return () => { tex.dispose() }
  }, [imageDataUrl])

  const floorY = -item.size[1] / 2

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 4, 3]} intensity={1.4} castShadow />
      <Grid
        args={[6, 6]}
        cellSize={0.1}
        sectionSize={0.5}
        cellColor="#aaaaaa"
        sectionColor="#888888"
        fadeDistance={8}
        position={[0, floorY, 0]}
      />
      <group rotation={[item.rotationX, item.rotationY, 0]} scale={item.size}>
        <mesh castShadow receiveShadow>
          <PrimitiveGeometry type={item.type} />
          {item.type === 'image' ? (
            <meshStandardMaterial
              map={imageTexture ?? undefined}
              color={imageTexture ? '#ffffff' : '#888888'}
              roughness={0.3}
              metalness={0}
            />
          ) : item.type === 'label' ? (
            <meshStandardMaterial
              map={labelTexture ?? undefined}
              color="#ffffff"
              roughness={0.4}
              metalness={0}
            />
          ) : (
            <meshStandardMaterial color={item.color} roughness={0.5} metalness={0.1} />
          )}
        </mesh>
      </group>
      <DimensionArrows size={item.size} position={[0, 0, 0]} rotationY={item.rotationY} />
      <OrbitControls makeDefault />
    </>
  )
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export function ItemEditorModal() {
  const editingItemId = useStore((s) => s.editingItemId)
  const layout = useStore((s) => s.layout)
  const closeItemEditor = useStore((s) => s.closeItemEditor)
  const patchItem = useStore((s) => s.patchItem)

  const storeItem = editingItemId ? findItem(layout, editingItemId) : undefined

  const [hist, dispatch] = useReducer(histReducer, {
    past: [],
    present: storeItem ?? ({} as Item),
    future: [],
  })

  // Reset history when a new item opens
  useEffect(() => {
    if (storeItem) dispatch({ type: 'RESET', item: storeItem })
  }, [editingItemId]) // intentionally not storeItem — only reset on open

  const handleCancel = () => closeItemEditor()

  // Keyboard shortcuts
  useEffect(() => {
    if (!editingItemId) return
    const typing = () => {
      const el = document.activeElement
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')
    }
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (e.key === 'Escape' && !typing()) { handleCancel(); return }
      if (mod && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        dispatch({ type: 'REDO' })
        return
      }
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        dispatch({ type: 'UNDO' })
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingItemId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!editingItemId || !storeItem) return null

  const draft = hist.present
  const canUndo = hist.past.length > 0
  const canRedo = hist.future.length > 0

  // Push an edit snapshot to history (call on blur / mouseup)
  const commit = (patch: Partial<Item>) => {
    dispatch({ type: 'EDIT', item: { ...draft, ...patch } })
  }

  const handleSave = () => {
    patchItem(draft.id, {
      size: draft.size,
      rotationY: draft.rotationY,
      rotationX: draft.rotationX,
      color: draft.color,
      labelText: draft.labelText,
      labelFontSize: draft.labelFontSize,
    })
    closeItemEditor()
  }

  const deg = Math.round((draft.rotationY * 180) / Math.PI)
  const tiltDeg = Math.round((draft.rotationX * 180) / Math.PI)

  // Camera distance to fit item
  const camDist = Math.max(...draft.size) * 3.5 + 0.5

  return (
    <div className="item-editor-backdrop" onClick={handleCancel}>
      <div className="item-editor-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="item-editor-header">
          <div className="item-editor-history">
            <button
              className="mini"
              disabled={!canUndo}
              onClick={() => dispatch({ type: 'UNDO' })}
              title="Undo (Cmd+Z)"
            >
              ← Undo
            </button>
            <button
              className="mini"
              disabled={!canRedo}
              onClick={() => dispatch({ type: 'REDO' })}
              title="Redo (Cmd+Shift+Z)"
            >
              Redo →
            </button>
          </div>
          <h2>{PRIMITIVE_LABELS[draft.type]} — detail editor</h2>
          <div className="item-editor-actions">
            <button className="mini" onClick={handleCancel}>Cancel</button>
            <button className="add" onClick={handleSave}>Save</button>
          </div>
        </div>

        {/* Body */}
        <div className="item-editor-body">
          {/* Mini canvas */}
          <div className="item-editor-canvas">
            <Canvas
              camera={{
                position: [camDist * 0.7, camDist * 0.5, camDist],
                fov: 40,
                near: 0.01,
                far: 50,
              }}
              shadows
            >
              <CameraUpdater camDist={camDist} />
              <ItemPreviewScene item={draft} />
            </Canvas>
          </div>

          {/* Properties */}
          <div className="item-editor-props panel">
            <h3>Size</h3>
            <NumberField
              label="Width"
              value={draft.size[0]}
              onChange={(v) => {
                const next: Vec3 = [...draft.size] as Vec3
                next[0] = v
                commit({ size: next })
              }}
            />
            <NumberField
              label="Height"
              value={draft.size[1]}
              onChange={(v) => {
                const next: Vec3 = [...draft.size] as Vec3
                next[1] = v
                commit({ size: next })
              }}
            />
            <NumberField
              label="Depth"
              value={draft.size[2]}
              onChange={(v) => {
                const next: Vec3 = [...draft.size] as Vec3
                next[2] = v
                commit({ size: next })
              }}
            />

            <h3>Rotation</h3>
            <label className="field">
              <span>Spin (Y)</span>
              <div className="field-input">
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={(deg + 360) % 360}
                  onChange={(e) => {
                    dispatch({
                      type: 'PREVIEW',
                      item: { ...draft, rotationY: (parseFloat(e.target.value) * Math.PI) / 180 },
                    })
                  }}
                  onMouseUp={(e) => {
                    commit({ rotationY: (parseFloat((e.target as HTMLInputElement).value) * Math.PI) / 180 })
                  }}
                />
                <input
                  type="number"
                  className="deg-input"
                  min={0}
                  max={360}
                  step={1}
                  value={(deg + 360) % 360}
                  onChange={(e) => commit({ rotationY: (parseFloat(e.target.value) * Math.PI) / 180 })}
                />
                <span className="unit">°</span>
              </div>
            </label>
            <div className="btn-row">
              <button className="mini" onClick={() => commit({ rotationY: draft.rotationY - Math.PI / 2 })}>
                ↺ 90°
              </button>
              <button className="mini" onClick={() => commit({ rotationY: draft.rotationY + Math.PI / 2 })}>
                ↻ 90°
              </button>
            </div>

            <label className="field">
              <span>Tilt (X)</span>
              <div className="field-input">
                <input
                  type="range"
                  min={-90}
                  max={90}
                  step={1}
                  value={tiltDeg}
                  onChange={(e) =>
                    dispatch({
                      type: 'PREVIEW',
                      item: {
                        ...draft,
                        rotationX: (parseFloat(e.target.value) * Math.PI) / 180,
                      },
                    })
                  }
                  onMouseUp={(e) =>
                    commit({ rotationX: (parseFloat((e.target as HTMLInputElement).value) * Math.PI) / 180 })
                  }
                />
                <span className="unit">{tiltDeg}°</span>
              </div>
            </label>
            <div className="btn-row">
              <button className="mini" onClick={() => commit({ rotationX: 0 })}>
                Stand up
              </button>
              <button className="mini" onClick={() => commit({ rotationX: Math.PI / 2 })}>
                Lay flat
              </button>
            </div>

            {draft.type === 'label' && (
              <>
                <h3>Label text</h3>
                <textarea
                  className="label-textarea"
                  rows={3}
                  placeholder="Museum card text…"
                  value={draft.labelText ?? ''}
                  onChange={(e) =>
                    dispatch({ type: 'EDIT', item: { ...draft, labelText: e.target.value } })
                  }
                  onBlur={(e) => commit({ labelText: e.target.value })}
                />
                <label className="field" style={{ marginTop: 8 }}>
                  <span>Font size</span>
                  <div className="field-input">
                    <input
                      type="range"
                      aria-label="Label font size"
                      min={10}
                      max={72}
                      step={1}
                      value={draft.labelFontSize ?? 30}
                      onChange={(e) =>
                        dispatch({ type: 'PREVIEW', item: { ...draft, labelFontSize: parseInt(e.target.value) } })
                      }
                      onMouseUp={(e) =>
                        commit({ labelFontSize: parseInt((e.target as HTMLInputElement).value) })
                      }
                    />
                    <span className="unit">{draft.labelFontSize ?? 30}px</span>
                  </div>
                </label>
              </>
            )}

            {draft.type !== 'image' && draft.type !== 'label' && (
              <>
                <h3>Colour</h3>
                <ColorControl
                  key={draft.id + draft.color}
                  color={draft.color}
                  onChange={(c) => commit({ color: c })}
                />
              </>
            )}

            {draft.type === 'image' && (
              <p className="hint muted" style={{ marginTop: 12 }}>
                Image source is set in the scene palette. Replace by dragging a new image onto the slot.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
