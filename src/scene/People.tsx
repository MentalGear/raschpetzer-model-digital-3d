import { useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useStore } from '../state/store'
import { useTheme } from '../ui/theme'

/** A scale-reference person: man / woman / two children, in metres. */
interface Person {
  label: string
  height: number
  color: string
}

const PEOPLE: Person[] = [
  { label: 'Man · 180 cm', height: 1.8, color: '#3c4655' },
  { label: 'Woman · 165 cm', height: 1.65, color: '#4a5566' },
  { label: 'Child · 120 cm', height: 1.2, color: '#5a6678' },
  { label: 'Child · 95 cm', height: 0.95, color: '#6a7688' },
]

/** Draws a simple human silhouette onto a canvas → texture (transparent bg). */
function silhouetteTexture(color: string): THREE.Texture {
  const w = 160
  const h = 360
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  g.clearRect(0, 0, w, h)
  g.fillStyle = color
  const cx = w / 2
  // head
  g.beginPath()
  g.arc(cx, 46, 30, 0, Math.PI * 2)
  g.fill()
  // neck + torso (shoulders -> waist)
  g.beginPath()
  g.moveTo(cx - 46, 96)
  g.lineTo(cx + 46, 96)
  g.lineTo(cx + 30, 210)
  g.lineTo(cx - 30, 210)
  g.closePath()
  g.fill()
  // arms
  g.fillRect(cx - 60, 100, 16, 110)
  g.fillRect(cx + 44, 100, 16, 110)
  // legs
  g.fillRect(cx - 28, 206, 22, 150)
  g.fillRect(cx + 6, 206, 22, 150)
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 4
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Human scale-reference cutouts standing in front of the showcase. Toggled from
 *  the toolbar. Positions/spacing derive from the current showcase bounds. */
export function People() {
  const show = useTheme((s) => s.showPeople)
  const segments = useStore((s) => s.layout.segments)

  const textures = useMemo(() => PEOPLE.map((p) => silhouetteTexture(p.color)), [])

  const placement = useMemo(() => {
    if (!segments.length) return null
    let minX = Infinity
    let maxX = -Infinity
    let frontZ = -Infinity
    for (const s of segments) {
      minX = Math.min(minX, s.position[0] - s.width / 2)
      maxX = Math.max(maxX, s.position[0] + s.width / 2)
      frontZ = Math.max(frontZ, s.position[2] + s.depth / 2)
    }
    const z = frontZ + 0.85 // stand in front of the glass
    return { minX, maxX, z }
  }, [segments])

  if (!show || !placement) return null
  const { minX, maxX, z } = placement
  const span = Math.max(1.2, maxX - minX)
  // spread the four people across the showcase width, in front
  const xs = PEOPLE.map((_, i) => minX + (span * (i + 0.5)) / PEOPLE.length)

  return (
    <group>
      {PEOPLE.map((p, i) => {
        const w = p.height * 0.42
        return (
          <group key={p.label} position={[xs[i], 0, z]}>
            <mesh position={[0, p.height / 2, 0]}>
              <planeGeometry args={[w, p.height]} />
              <meshBasicMaterial
                map={textures[i]}
                transparent
                alphaTest={0.4}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            </mesh>
            <Html position={[0, p.height + 0.08, 0]} center className="people-tag">
              <div className="person-label">{p.label}</div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}
