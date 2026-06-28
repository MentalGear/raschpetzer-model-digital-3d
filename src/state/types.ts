// All spatial values are stored in METERS (three.js convention: 1 unit = 1 m).
// The UI displays centimetres (value * 100).

export type Vec3 = [number, number, number]

export type ItemType = 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus'

export type Mode = 'design' | 'place'

export type TransformMode = 'translate' | 'rotate' | 'scale'

/** A primitive object placed on a shelf. Rendered as unit geometry scaled by `size`. */
export interface Item {
  id: string
  type: ItemType
  /** World position of the object's centre (metres). */
  position: Vec3
  /** Rotation about the Y axis (radians). */
  rotationY: number
  /** Bounding dimensions in metres [width, height, depth] = the object's scale. */
  size: Vec3
  color: string
  /** Shelf the item currently rests on, if any. */
  shelfId: string | null
}

/** A horizontal glass panel inside a segment. */
export interface Shelf {
  id: string
  /** Height of the shelf's top surface above the segment floor (metres). */
  height: number
  /** Glass thickness (metres). */
  thickness: number
}

/** A vertical wooden separation panel splitting a segment into compartments. */
export interface Divider {
  id: string
  /** Distance of the panel centre from the left interior wall (metres). */
  x: number
}

/** A single wooden cabinet bay. Frame panels are wood; shelves are glass. */
export interface Segment {
  id: string
  /** World position of the segment footprint centre at floor level (metres). */
  position: Vec3
  width: number
  height: number
  depth: number
  /** Wooden panel thickness (metres). */
  frameThickness: number
  shelves: Shelf[]
  /** Vertical separation panels, ordered left-to-right. */
  dividers: Divider[]
}

export interface Layout {
  version: number
  segments: Segment[]
  items: Item[]
}

export type SelectedKind = 'segment' | 'item'

export interface Selection {
  kind: SelectedKind
  id: string
}
