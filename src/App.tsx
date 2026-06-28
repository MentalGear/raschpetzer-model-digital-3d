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
  const theme = useTheme((s) => s.theme)

  // Apply the theme to the document root so CSS variables switch.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Delete / Backspace removes the current selection (unless typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) return
      const { selected, removeItem, removeSegment } = useStore.getState()
      if (!selected) return
      e.preventDefault()
      if (selected.kind === 'item') removeItem(selected.id)
      else removeSegment(selected.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(ITEM_DND_MIME)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  const onDrop = (e: React.DragEvent) => {
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

  return (
    <div className="app">
      <Toolbar />
      <div className="workspace">
        <div className="canvas-wrap" onDragOver={onDragOver} onDrop={onDrop}>
          <Canvas
            shadows
            camera={{ position: [2.6, 2.4, 3.4], fov: 50, near: 0.05, far: 100 }}
            onPointerMissed={() => select(null)}
          >
            <color attach="background" args={[canvasBg[theme]]} />
            <SceneBridge getterRef={threeRef} />
            <CameraRig />
            <Showcase />
          </Canvas>
          <div className="mode-badge">{mode === 'design' ? 'Design mode' : 'Placement mode'}</div>
        </div>
        <SidePanel />
      </div>
    </div>
  )
}
