import { findSegment, useStore } from '../state/store'
import type { Vec3 } from '../state/types'
import { Segment } from './Segment'
import { Item } from './Item'
import { DimensionArrows } from './DimensionArrows'

/** Renders every segment and placed item from layout state. */
export function Showcase() {
  const segments = useStore((s) => s.layout.segments)
  const items = useStore((s) => s.layout.items)
  const mode = useStore((s) => s.mode)
  const selected = useStore((s) => s.selected)
  const layout = useStore((s) => s.layout)

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
        <DimensionArrows size={[seg.width, seg.height, seg.depth]} position={segCenter} />
      )}
    </group>
  )
}
