import { useState } from 'react'
import * as THREE from 'three'
import { Html, TransformControls } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { Item as ItemT, Vec3 } from '../state/types'
import { seatedY, shelfSurfaces, useStore } from '../state/store'
import { snapGrid } from '../state/units'
import { PrimitiveGeometry } from './primitives'
import { DimensionArrows } from './DimensionArrows'

interface ItemProps {
  item: ItemT
}

/**
 * A placed primitive. The group's `scale` IS the item's size in metres (unit
 * geometry), so the scale gizmo writes straight back to state. When selected in
 * placement mode it gets a TransformControls gizmo + live dimension arrows.
 *
 * Attached items stay seated on their shelf surface (free X/Z, Y derived). Fixed
 * items float freely on all three axes.
 */
export function Item({ item }: ItemProps) {
  const [obj, setObj] = useState<THREE.Group | null>(null)
  const mode = useStore((s) => s.mode)
  const transformMode = useStore((s) => s.transformMode)
  const selected = useStore((s) => s.selected?.kind === 'item' && s.selected.id === item.id)
  const select = useStore((s) => s.select)
  const moveItem = useStore((s) => s.moveItem)
  const resizeItem = useStore((s) => s.resizeItem)
  const rotateItem = useStore((s) => s.rotateItem)

  const interactive = mode === 'place'

  const onSelect = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return
    e.stopPropagation()
    select({ kind: 'item', id: item.id })
  }

  const handleChange = () => {
    if (!obj) return
    if (transformMode === 'scale') {
      resizeItem(item.id, [obj.scale.x, obj.scale.y, obj.scale.z])
    } else if (transformMode === 'rotate') {
      rotateItem(item.id, obj.rotation.y)
    } else if (item.attached) {
      // attached: snap to the nearest shelf surface within the same compartment
      // (X/Z free, Y seated). Prefer shelves whose X-extent contains the item.
      const surfaces = shelfSurfaces(useStore.getState().layout)
      let pos: Vec3 = [snapGrid(obj.position.x), obj.position.y, snapGrid(obj.position.z)]
      let shelfId = item.shelfId
      const inSection = surfaces.filter(
        (s) => obj.position.x >= s.xMin && obj.position.x <= s.xMax,
      )
      const pool = inSection.length ? inSection : surfaces
      if (pool.length) {
        const seatFor = (topY: number) => seatedY(item.size, item.rotationX, topY)
        const nearest = pool.reduce((best, s) =>
          Math.abs(seatFor(s.topY) - obj.position.y) < Math.abs(seatFor(best.topY) - obj.position.y)
            ? s
            : best,
        )
        pos = [pos[0], seatFor(nearest.topY), pos[2]]
        shelfId = nearest.shelfId
      }
      moveItem(item.id, pos, shelfId)
    } else {
      // fixed in space: free move on all axes, no shelf
      moveItem(item.id, [snapGrid(obj.position.x), obj.position.y, snapGrid(obj.position.z)], null)
    }
  }

  // In translate mode, attached items lock the Y handle (they ride the shelf);
  // fixed items expose all three handles.
  const showY = transformMode === 'scale' || (transformMode === 'translate' && !item.attached)

  const content = (
    <group
      ref={setObj}
      position={item.position}
      rotation={[item.rotationX, item.rotationY, 0]}
      scale={item.size}
      onPointerDown={onSelect}
    >
      <mesh castShadow receiveShadow>
        <PrimitiveGeometry type={item.type} />
        <meshStandardMaterial color={item.color} roughness={0.5} metalness={0.1} />
      </mesh>
    </group>
  )

  return (
    <>
      {selected && obj ? (
        <TransformControls
          object={obj}
          mode={transformMode}
          showX={transformMode !== 'rotate'}
          showY={showY}
          showZ={transformMode !== 'rotate'}
          onObjectChange={handleChange}
        />
      ) : null}
      {content}
      {selected && (
        <>
          <DimensionArrows size={item.size} position={item.position} rotationY={item.rotationY} />
          <Html
            position={[
              item.position[0],
              item.position[1] + item.size[1] / 2 + 0.07,
              item.position[2],
            ]}
            center
            className="item-tag-html"
          >
            <div className={`item-tag ${item.attached ? 'attached' : 'fixed'}`}>
              {item.attached ? '📌 On surface' : '✣ Fixed'} · tilt {Math.round((item.rotationX * 180) / Math.PI)}°
            </div>
          </Html>
        </>
      )}
    </>
  )
}
