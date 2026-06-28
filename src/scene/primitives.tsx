import type { ItemType } from '../state/types'

export const PRIMITIVE_TYPES: ItemType[] = ['box', 'cylinder', 'sphere', 'cone', 'torus']

export const PRIMITIVE_LABELS: Record<ItemType, string> = {
  box: 'Box',
  cylinder: 'Cylinder',
  sphere: 'Sphere',
  cone: 'Cone',
  torus: 'Torus',
}

/**
 * Geometry authored at UNIT size (~1 m bounding box) so the parent group's
 * `scale` directly equals the item's real-world size in metres. This lets the
 * scale gizmo write straight back into `size` with no conversion.
 */
export function PrimitiveGeometry({ type }: { type: ItemType }) {
  switch (type) {
    case 'box':
      return <boxGeometry args={[1, 1, 1]} />
    case 'cylinder':
      return <cylinderGeometry args={[0.5, 0.5, 1, 48]} />
    case 'sphere':
      return <sphereGeometry args={[0.5, 48, 32]} />
    case 'cone':
      return <coneGeometry args={[0.5, 1, 48]} />
    case 'torus':
      // outer radius 0.5 so the XZ bounding box is ~1 unit
      return <torusGeometry args={[0.35, 0.15, 24, 48]} />
  }
}
