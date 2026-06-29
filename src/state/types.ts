// All spatial values are stored in METERS (three.js convention: 1 unit = 1 m).
// The UI displays centimetres (value * 100).

export type Vec3 = [number, number, number]

export type ItemType = 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus' | 'image' | 'label'

export type Mode = 'design' | 'place' | 'presets'

export type TransformMode = 'translate' | 'rotate' | 'scale'

/** A primitive object placed on a shelf. Rendered as unit geometry scaled by `size`. */
export interface Item {
  id: string
  type: ItemType
  /** World position of the object's centre (metres). */
  position: Vec3
  /** Rotation about the Y axis (radians) — turntable spin. */
  rotationY: number
  /** Tilt about the X axis (radians) — lean/lay-flat. */
  rotationX: number
  /** Bounding dimensions in metres [width, height, depth] = the object's scale. */
  size: Vec3
  color: string
  /** For 'image' items: key into the IndexedDB image store. */
  imageId?: string
  /** For 'label' items: text content of the museum card. */
  labelText?: string
  /** Shelf the item currently rests on, if any. */
  shelfId: string | null
  /**
   * true  = rests on its contact surface; follows its shelf and re-seats on tilt.
   * false = fixed in space; free to move on all axes and ignores the shelf.
   */
  attached: boolean
}

/** A horizontal glass panel inside a segment. */
export interface Shelf {
  id: string
  /** Height of the shelf's top surface above the segment floor (metres). */
  height: number
  /** Glass thickness (metres). */
  thickness: number
  /** Whether this shelf can be moved along Y while in placement mode. Set in Design. */
  movable: boolean
  /** Index of the compartment (between separation panels) this shelf belongs to. */
  compartment: number
  /** When true, the shelf (and items attached to it) is hidden in the scene. */
  hidden?: boolean
}

export type PanelMaterial = 'wood' | 'glass'

/** A vertical separation panel splitting a segment into compartments. */
export interface Divider {
  id: string
  /** Distance of the panel centre from the left interior wall (metres). */
  x: number
  /** Panel thickness (metres). */
  thickness: number
  /** Panel material — solid wood or translucent glass. */
  material: PanelMaterial
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
  /**
   * Per-cabinet wood brightness override. `undefined` = linked to the layout's
   * shared `woodBrightness` (synced); a number = independent.
   */
  woodBrightness?: number
}

export interface Layout {
  version: number
  segments: Segment[]
  items: Item[]
  /** Shared wood-brightness value used by all cabinets that are "linked" (synced). */
  woodBrightness: number
  /** Glass opacity for all shelves and glass panels (0.1 = nearly clear, 0.8 = quite opaque). */
  glassOpacity: number
  /** Tint hex colour applied to all glass surfaces. */
  glassTint: string
  /** Height of the display above the real floor, e.g. on a plinth (metres). People stay at Y=0. */
  groundOffset: number
}

export type SelectedKind = 'segment' | 'item' | 'shelf'

export interface Selection {
  kind: SelectedKind
  id: string
}
