import { useState } from 'react'
import { Edges } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { Segment as SegmentT } from '../state/types'
import { useStore } from '../state/store'

const WOOD_COLOR = '#7a4a24'
const DIVIDER_COLOR = '#946134' // lighter so structural panels read as distinct
const GLASS_COLOR = '#bcdcea'
const GLASS_EDGE = '#eaf6ff'

interface SegmentProps {
  segment: SegmentT
}

/**
 * A wooden cabinet bay: solid wood panels (left/right/back/top/bottom) with the
 * front open for viewing, plus translucent glass shelves. Rendered in local
 * coordinates where the footprint centre sits at the origin and the floor is y=0.
 */
export function Segment({ segment }: SegmentProps) {
  const { position, width: w, height: h, depth: d, frameThickness: t, shelves, dividers } = segment
  const mode = useStore((s) => s.mode)
  const selected = useStore((s) => s.selected?.kind === 'segment' && s.selected.id === segment.id)
  const select = useStore((s) => s.select)
  const [hovered, setHovered] = useState(false)

  const designable = mode === 'design'

  const onSelect = (e: ThreeEvent<PointerEvent>) => {
    if (!designable) return
    e.stopPropagation()
    select({ kind: 'segment', id: segment.id })
  }

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    if (!designable) return
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }
  const onOut = () => {
    setHovered(false)
    document.body.style.cursor = ''
  }

  const innerW = Math.max(0.001, w - 2 * t)
  const innerD = Math.max(0.001, d - 2 * t)
  // Selection = warm glow; hover (design mode) = subtle lift.
  const emissive = selected ? '#caa15a' : hovered ? '#caa15a' : '#000000'
  const emissiveIntensity = selected ? 0.35 : hovered ? 0.18 : 0

  const wood = (color = WOOD_COLOR) => (
    <meshStandardMaterial
      color={color}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      roughness={0.65}
      metalness={0.05}
    />
  )

  return (
    <group position={position} onPointerDown={onSelect} onPointerOver={onOver} onPointerOut={onOut}>
      {/* bottom */}
      <mesh position={[0, t / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, t, d]} />
        {wood()}
      </mesh>
      {/* top */}
      <mesh position={[0, h - t / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, t, d]} />
        {wood()}
      </mesh>
      {/* left */}
      <mesh position={[-(w / 2 - t / 2), h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[t, h, d]} />
        {wood()}
      </mesh>
      {/* right */}
      <mesh position={[w / 2 - t / 2, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[t, h, d]} />
        {wood()}
      </mesh>
      {/* back */}
      <mesh position={[0, h / 2, -(d / 2 - t / 2)]} castShadow receiveShadow>
        <boxGeometry args={[w, h, t]} />
        {wood()}
      </mesh>

      {/* vertical separation panels (wood, lighter tone + edges to read as distinct) */}
      {dividers.map((dv) => {
        const xLocal = -(w / 2) + t + dv.x
        return (
          <mesh key={dv.id} position={[xLocal, h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[t, Math.max(0.001, h - 2 * t), innerD]} />
            {wood(DIVIDER_COLOR)}
            <Edges threshold={15} color="#caa46a" />
          </mesh>
        )
      })}

      {/* glass shelves */}
      {shelves.map((sh) => (
        <mesh
          key={sh.id}
          position={[0, sh.height, 0]}
          userData={{ shelfId: sh.id, segmentId: segment.id }}
          name={`shelf:${sh.id}`}
        >
          <boxGeometry args={[innerW, sh.thickness, innerD]} />
          <meshStandardMaterial
            color={GLASS_COLOR}
            transparent
            opacity={0.45}
            roughness={0.04}
            metalness={0.1}
          />
          <Edges threshold={15} color={GLASS_EDGE} />
        </mesh>
      ))}
    </group>
  )
}
