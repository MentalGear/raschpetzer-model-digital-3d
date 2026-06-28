import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import type { RootState } from '@react-three/fiber'
import { CameraRig } from './scene/CameraRig'
import { Showcase } from './scene/Showcase'
import { SceneBridge } from './scene/SceneBridge'
import { shelfSurfaces, useStore } from './state/store'
import type { ItemType, Vec3 } from './state/types'
import { snapGrid } from './state/units'
import { Toolbar } from './ui/Toolbar'
import { SidePanel } from './ui/SidePanel'
import { ITEM_DND_MIME, DEFAULT_DROP_HALF_HEIGHT } from './ui/dnd'
import { canvasBg, useTheme } from './ui/theme'

export default function App() {
  const threeRef = useRef<(() => RootState) | null>(null)
  const addItem = useStore((s) => s.addItem)
  const select = useStore((s) => s.select)
  const mode = useStore((s) => s.mode)
  const selected = useStore((s) => s.selected)
  const dropActive = useStore((s) => s.placing)
  const setDropActive = useStore((s) => s.setPlacing)
  const theme = useTheme((s) => s.theme)

  // Apply the theme to the document root so CSS variables switch.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Cold start: auto-select the first cabinet so the panel is never an empty mystery.
  useEffect(() => {
    const { selected: sel, layout } = useStore.getState()
    if (!sel && layout.segments[0]) select({ kind: 'segment', id: layout.segments[0].id })
  }, [select])

  // Keyboard shortcuts: Delete removes selection; D/P switch modes (when not typing).
  useEffect(() => {
    const typing = () => {
      const el = document.activeElement
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')
    }
    const onKey = (e: KeyboardEvent) => {
      if (typing()) return
      const { selected: sel, removeItem, removeSegment, setMode } = useStore.getState()
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!sel) return
        e.preventDefault()
        if (sel.kind === 'item') removeItem(sel.id)
        else removeSegment(sel.id)
      } else if (e.key === 'd' || e.key === 'D') {
        setMode('design')
      } else if (e.key === 'p' || e.key === 'P') {
        setMode('place')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(ITEM_DND_MIME)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      if (!dropActive) setDropActive(true)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    setDropActive(false)
    const type = e.dataTransfer.getData(ITEM_DND_MIME) as ItemType
    if (!type || !threeRef.current) return
    e.preventDefault()
    const { camera, scene, raycaster, gl } = threeRef.current()
    const rect = gl.domElement.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(ndc, camera)

    const hits = raycaster.intersectObjects(scene.children, true)
    const shelfHit = hits.find((h) => h.object.userData?.shelfId)
    const halfH = DEFAULT_DROP_HALF_HEIGHT

    let position: Vec3
    let shelfId: string | null
    if (shelfHit) {
      const sid = shelfHit.object.userData.shelfId as string
      const surf = shelfSurfaces(useStore.getState().layout).find((s) => s.shelfId === sid)
      position = [
        snapGrid(shelfHit.point.x),
        (surf?.topY ?? shelfHit.point.y) + halfH,
        snapGrid(shelfHit.point.z),
      ]
      shelfId = sid
    } else {
      const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const target = new THREE.Vector3()
      raycaster.ray.intersectPlane(ground, target)
      position = [snapGrid(target.x), halfH, snapGrid(target.z)]
      shelfId = null
    }
    addItem(type, position, shelfId)
  }

  // Contextual instruction shown over the canvas.
  const badge =
    mode === 'design'
      ? selected?.kind === 'segment'
        ? { text: 'Editing cabinet — drag handles or use the panel', cta: false }
        : { text: 'Click a cabinet to start editing', cta: true }
      : selected?.kind === 'item'
        ? { text: 'Editing item — Move · Rotate · Resize in the panel', cta: false }
        : { text: 'Drag a shape from the palette onto a shelf', cta: true }

  return (
    <div className="app">
      <Toolbar />
      <div className="workspace">
        <div
          className={`canvas-wrap${dropActive ? ' drop-active' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={() => setDropActive(false)}
          onDrop={onDrop}
        >
          <Canvas
            shadows
            camera={{ position: [3.0, 2.4, 3.9], fov: 50, near: 0.05, far: 100 }}
            onPointerMissed={() => select(null)}
          >
            <color attach="background" args={[canvasBg[theme]]} />
            <SceneBridge getterRef={threeRef} />
            <CameraRig />
            <Showcase />
          </Canvas>
          <div className={`mode-badge${badge.cta ? ' cta' : ''}`}>{badge.text}</div>
          {dropActive && <div className="drop-hint">Drop onto a shelf</div>}
        </div>
        <SidePanel />
      </div>
    </div>
  )
}
