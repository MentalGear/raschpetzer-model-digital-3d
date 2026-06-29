import { useEffect, useRef, useState } from 'react'
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

/** When a group is selected, attaches TransformControls to the anchor item's mesh
 *  and translates all group members by the same delta on every drag frame. */
function GroupGizmo() {
  const selectedGroupId = useStore((s) => (s.selected?.kind === 'group' ? s.selected.id : null))
  const layout = useStore((s) => s.layout)
  const moveItem = useStore((s) => s.moveItem)
  const scene = useThree((s) => s.scene)
  const [anchorMesh, setAnchorMesh] = useState<THREE.Object3D | null>(null)

  const groupItems = selectedGroupId
    ? layout.items.filter((it) => it.groupId === selectedGroupId)
    : []
  const anchorItemId = groupItems[0]?.id ?? null

  useEffect(() => {
    if (!anchorItemId) { setAnchorMesh(null); return }
    setAnchorMesh(scene.getObjectByName(`item:${anchorItemId}`) ?? null)
  }, [anchorItemId, scene, layout.items.length])

  const startPositions = useRef<Map<string, Vec3>>(new Map())
  const anchorStartPos = useRef<THREE.Vector3>(new THREE.Vector3())

  if (!selectedGroupId || !anchorItemId || !anchorMesh) return null

  const anyAttached = groupItems.some((it) => it.attached)

  return (
    <TransformControls
      object={anchorMesh}
      mode="translate"
      showY={!anyAttached}
      onMouseDown={() => {
        const items = useStore.getState().layout.items.filter((it) => it.groupId === selectedGroupId)
        items.forEach((it) => startPositions.current.set(it.id, [...it.position] as Vec3))
        const anchor = items.find((it) => it.id === anchorItemId)
        if (anchor) anchorStartPos.current.set(...(anchor.position as [number, number, number]))
      }}
      onObjectChange={() => {
        const delta = new THREE.Vector3().subVectors(anchorMesh.position, anchorStartPos.current)
        const items = useStore.getState().layout.items.filter((it) => it.groupId === selectedGroupId)
        items.forEach((it) => {
          const start = startPositions.current.get(it.id)
          if (!start) return
          moveItem(it.id, [start[0] + delta.x, start[1] + delta.y, start[2] + delta.z])
        })
      }}
    />
  )
}

/** Renders every segment and placed item from layout state. */
export function Showcase() {
  const segments = useStore((s) => s.layout.segments)
  const items = useStore((s) => s.layout.items)
  const groundOffset = useStore((s) => s.layout.groundOffset)
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
    <>
      {/* People stand on the real floor regardless of groundOffset */}
      <People />
      {/* The showcase and all items lift by groundOffset (e.g. on a plinth) */}
      <group position={[0, groundOffset, 0]}>
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
        <GroupGizmo />
      </group>
    </>
  )
}
