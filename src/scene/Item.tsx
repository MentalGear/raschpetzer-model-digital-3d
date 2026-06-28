import { useState } from 'react'
import * as THREE from 'three'
import { TransformControls } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { Item as ItemT, Vec3 } from '../state/types'
import { shelfSurfaces, useStore } from '../state/store'
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
    } else {
      // translate: keep the item resting on the nearest shelf surface
      const surfaces = shelfSurfaces(useStore.getState().layout)
      const halfH = item.size[1] / 2
      let pos: Vec3 = [snapGrid(obj.position.x), obj.position.y, snapGrid(obj.position.z)]
      let shelfId = item.shelfId
      if (surfaces.length) {
        const nearest = surfaces.reduce((best, s) =>
          Math.abs(s.topY + halfH - obj.position.y) < Math.abs(best.topY + halfH - obj.position.y)
            ? s
            : best,
        )
        pos = [pos[0], nearest.topY + halfH, pos[2]]
        shelfId = nearest.shelfId
      }
      moveItem(item.id, pos, shelfId)
    }
  }

  const content = (
    <group
      ref={setObj}
      position={item.position}
      rotation={[0, item.rotationY, 0]}
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
          showY={transformMode !== 'translate'}
          showZ={transformMode !== 'rotate'}
          onObjectChange={handleChange}
        />
      ) : null}
      {content}
      {selected && (
        <DimensionArrows size={item.size} position={item.position} rotationY={item.rotationY} />
      )}
    </>
  )
}
