import type { ThreeEvent } from '@react-three/fiber'
import type { Segment as SegmentT } from '../state/types'
import { useStore } from '../state/store'

const WOOD_COLOR = '#8a5a2b'
const GLASS_COLOR = '#bfe3ef'

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

  const onSelect = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'design') return
    e.stopPropagation()
    select({ kind: 'segment', id: segment.id })
  }

  const innerW = Math.max(0.001, w - 2 * t)
  const innerD = Math.max(0.001, d - 2 * t)
  const emissive = selected ? '#5a3a1a' : '#000000'

  return (
    <group position={position} onPointerDown={onSelect}>
      {/* bottom */}
      <mesh position={[0, t / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, t, d]} />
        <meshStandardMaterial color={WOOD_COLOR} emissive={emissive} roughness={0.8} />
      </mesh>
      {/* top */}
      <mesh position={[0, h - t / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, t, d]} />
        <meshStandardMaterial color={WOOD_COLOR} emissive={emissive} roughness={0.8} />
      </mesh>
      {/* left */}
      <mesh position={[-(w / 2 - t / 2), h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial color={WOOD_COLOR} emissive={emissive} roughness={0.8} />
      </mesh>
      {/* right */}
      <mesh position={[w / 2 - t / 2, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial color={WOOD_COLOR} emissive={emissive} roughness={0.8} />
      </mesh>
      {/* back */}
      <mesh position={[0, h / 2, -(d / 2 - t / 2)]} castShadow receiveShadow>
        <boxGeometry args={[w, h, t]} />
        <meshStandardMaterial color={WOOD_COLOR} emissive={emissive} roughness={0.8} />
      </mesh>

      {/* vertical separation panels (wood) */}
      {dividers.map((dv) => {
        const xLocal = -(w / 2) + t + dv.x
        return (
          <mesh key={dv.id} position={[xLocal, h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[t, Math.max(0.001, h - 2 * t), innerD]} />
            <meshStandardMaterial color={WOOD_COLOR} emissive={emissive} roughness={0.8} />
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
            opacity={0.28}
            roughness={0.05}
            metalness={0}
          />
        </mesh>
      ))}
    </group>
  )
}
