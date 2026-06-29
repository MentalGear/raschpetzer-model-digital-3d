import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { TransformControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { findSegment, findShelf, useStore } from '../state/store'
import type { Vec3 } from '../state/types'
import { Segment } from './Segment'
import { Item } from './Item'
import { People } from './People'
import { DimensionArrows } from './DimensionArrows'
import { useTheme } from '../ui/theme'

/** Vertical move gizmo for a selected shelf. Rendered at the (identity) Showcase
 *  level — not inside the segment group — so it is not double-offset. Moving it
 *  updates the shelf height; the store re-seats any attached items. */
function ShelfGizmo() {
  const selectedId = useStore((s) => (s.selected?.kind === 'shelf' ? s.selected.id : null))
  const setShelfHeight = useStore((s) => s.setShelfHeight)
  const layout = useStore((s) => s.layout)
  const scene = useThree((s) => s.scene)
  const [mesh, setMesh] = useState<THREE.Object3D | null>(null)

  useEffect(() => {
    setMesh(selectedId ? (scene.getObjectByName(`shelf:${selectedId}`) ?? null) : null)
  }, [selectedId, scene, layout])

  if (!selectedId || !mesh) return null
  const ref = findShelf(layout, selectedId)
  if (!ref) return null

  return (
    <TransformControls
      object={mesh}
      mode="translate"
      showX={false}
      showZ={false}
      onObjectChange={() => setShelfHeight(ref.segment.id, selectedId, mesh.position.y)}
    />
  )
}

/** Renders every segment and placed item from layout state. */
export function Showcase() {
  const segments = useStore((s) => s.layout.segments)
  const items = useStore((s) => s.layout.items)
  const mode = useStore((s) => s.mode)
  const selected = useStore((s) => s.selected)
  const layout = useStore((s) => s.layout)
  const planView = useTheme((s) => s.planView)
  const frontView = useTheme((s) => s.frontView)

  const seg = mode === 'design' && selected?.kind === 'segment' ? findSegment(layout, selected.id) : undefined
  const segCenter: Vec3 | null = seg
    ? [seg.position[0], seg.position[1] + seg.height / 2, seg.position[2]]
    : null

  return (
    <group>
      {segments.map((s) => (
        <Segment key={s.id} segment={s} />
      ))}
      {items.map((it) => (
        <Item key={it.id} item={it} />
      ))}
      {seg && segCenter && (
        <DimensionArrows size={[seg.width, seg.height, seg.depth]} position={segCenter} hideY={planView} hideZ={frontView} />
      )}
      <ShelfGizmo />
      <People />
    </group>
  )
}
