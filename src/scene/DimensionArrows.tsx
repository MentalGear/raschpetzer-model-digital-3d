import { Html, Line } from '@react-three/drei'
import type { Vec3 } from '../state/types'
import { formatCm } from '../state/units'

type Axis = 'x' | 'y' | 'z'

const AXIS_COLOR: Record<Axis, string> = {
  x: '#e5484d', // width
  y: '#30a46c', // height
  z: '#0091ff', // depth
}

const AXIS_LABEL: Record<Axis, string> = { x: 'W', y: 'H', z: 'D' }

interface DimAxisProps {
  axis: Axis
  /** half-extents [w/2, h/2, d/2] in metres */
  half: Vec3
  length: number
  margin: number
}

/** One double-headed dimension arrow with a live cm label, offset outside the box. */
function DimAxis({ axis, half, length, margin }: DimAxisProps) {
  const [hx, hy, hz] = half
  const color = AXIS_COLOR[axis]
  const headLen = Math.min(0.03, length * 0.2)

  // Place each arrow just outside the box along the other two axes.
  let a: Vec3
  let b: Vec3
  let labelPos: Vec3
  if (axis === 'x') {
    const y = -hy - margin
    const z = hz + margin
    a = [-hx, y, z]
    b = [hx, y, z]
    labelPos = [0, y, z]
  } else if (axis === 'y') {
    const x = -hx - margin
    const z = hz + margin
    a = [x, -hy, z]
    b = [x, hy, z]
    labelPos = [x, 0, z]
  } else {
    const y = -hy - margin
    const x = hx + margin
    a = [x, y, -hz]
    b = [x, y, hz]
    labelPos = [x, y, 0]
  }

  // Arrowheads: two short segments at each end, in a plane.
  const headLines: [Vec3, Vec3][] = []
  const mk = (tip: Vec3, dir: Vec3) => {
    // perpendicular offsets depending on axis
    const perp: Vec3 =
      axis === 'x' ? [0, headLen * 0.6, 0] : axis === 'y' ? [headLen * 0.6, 0, 0] : [0, headLen * 0.6, 0]
    const back: Vec3 = [tip[0] - dir[0] * headLen, tip[1] - dir[1] * headLen, tip[2] - dir[2] * headLen]
    headLines.push([tip, [back[0] + perp[0], back[1] + perp[1], back[2] + perp[2]]])
    headLines.push([tip, [back[0] - perp[0], back[1] - perp[1], back[2] - perp[2]]])
  }
  const dir: Vec3 = axis === 'x' ? [1, 0, 0] : axis === 'y' ? [0, 1, 0] : [0, 0, 1]
  mk(b, dir)
  mk(a, [-dir[0], -dir[1], -dir[2]])

  return (
    <group>
      <Line points={[a, b]} color={color} lineWidth={1.5} />
      {headLines.map((seg, i) => (
        <Line key={i} points={seg} color={color} lineWidth={1.5} />
      ))}
      <Html position={labelPos} center distanceFactor={2} zIndexRange={[100, 0]}>
        <div className={`dim-label dim-${axis}`}>
          {AXIS_LABEL[axis]} {formatCm(length)}
        </div>
      </Html>
    </group>
  )
}

interface DimensionArrowsProps {
  /** full dimensions in metres [w, h, d] */
  size: Vec3
  position: Vec3
  rotationY?: number
}

/**
 * Renders three live metric dimension arrows (W/H/D in cm) around a box.
 * Used for both resized items and selected segments.
 */
export function DimensionArrows({ size, position, rotationY = 0 }: DimensionArrowsProps) {
  const half: Vec3 = [size[0] / 2, size[1] / 2, size[2] / 2]
  const margin = 0.04
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <DimAxis axis="x" half={half} length={size[0]} margin={margin} />
      <DimAxis axis="y" half={half} length={size[1]} margin={margin} />
      <DimAxis axis="z" half={half} length={size[2]} margin={margin} />
    </group>
  )
}
