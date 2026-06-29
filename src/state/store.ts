import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Divider,
  Item,
  ItemType,
  Layout,
  Mode,
  Segment,
  Selection,
  Shelf,
  TransformMode,
  Vec3,
} from './types'
import { clamp } from './units'

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const SEGMENT_GAP = 0.04 // 4 cm between adjacent cabinets

const defaultItemColor = '#c9a14a'

const DEFAULT_ITEM_SIZE: Vec3 = [0.2, 0.2, 0.2]

const DEFAULT_PANEL_THICKNESS = 0.03

function makeShelf(height: number, movable = true, compartment = 0): Shelf {
  return { id: uid(), height, thickness: 0.01, movable, compartment }
}

function makeDivider(
  x: number,
  thickness = DEFAULT_PANEL_THICKNESS,
  material: Divider['material'] = 'wood',
): Divider {
  return { id: uid(), x, thickness, material }
}

const sortDividers = (ds: Divider[]): Divider[] => [...ds].sort((a, b) => a.x - b.x)

function makeSegment(xCenter: number): Segment {
  return {
    id: uid(),
    position: [xCenter, 0, 0],
    width: 0.9,
    height: 1.8,
    depth: 0.4,
    frameThickness: 0.03,
    shelves: [makeShelf(0.6), makeShelf(1.2)],
    dividers: [],
  }
}

/** Interior width of a segment (between the left/right wood walls). */
export const innerWidth = (s: Segment): number => Math.max(0.001, s.width - 2 * s.frameThickness)

export interface Compartment {
  index: number
  /** from-left-wall coordinates (metres) */
  loFx: number
  hiFx: number
  centerFx: number
  width: number
}

/** The compartments a segment's separation panels divide it into, left → right. */
export function compartments(seg: Segment): Compartment[] {
  const iw = innerWidth(seg)
  const sorted = [...seg.dividers].sort((a, b) => a.x - b.x)
  const out: Compartment[] = []
  const push = (lo: number, hi: number) => {
    const width = Math.max(0.001, hi - lo)
    out.push({ index: out.length, loFx: lo, hiFx: hi, centerFx: (lo + hi) / 2, width })
  }
  let start = 0
  for (const d of sorted) {
    push(start, Math.max(start, d.x - d.thickness / 2))
    start = d.x + d.thickness / 2
  }
  push(start, iw)
  return out
}

/** Local X (segment space) of a from-left-wall coordinate. */
const localX = (seg: Segment, fx: number): number => -(seg.width / 2) + seg.frameThickness + fx

/** Right edge X of a segment in world space. */
const segRight = (s: Segment): number => s.position[0] + s.width / 2

/** World Y of a shelf's top surface. */
const shelfTopY = (seg: Segment, sh: Shelf): number => seg.position[1] + sh.height + sh.thickness / 2

/** Half-height of an item's bounding box once tilted about X. */
function tiltedHalfHeight(size: Vec3, rotationX: number): number {
  return (Math.abs(Math.cos(rotationX)) * size[1] + Math.abs(Math.sin(rotationX)) * size[2]) / 2
}

/** Y position that seats an item on a given surface, accounting for tilt. */
export function seatedY(size: Vec3, rotationX: number, topY: number): number {
  return topY + tiltedHalfHeight(size, rotationX)
}

/** A cabinet sized by INNER dimensions (wall thickness added to get the outer box). */
function cabinetByInner(
  xCenter: number,
  innerW: number,
  innerH: number,
  shelves: Shelf[],
  t = 0.03,
): Segment {
  return {
    id: uid(),
    position: [xCenter, 0, 0],
    width: innerW + 2 * t,
    height: innerH + 2 * t,
    depth: 0.4,
    frameThickness: t,
    shelves,
    dividers: [],
  }
}

/**
 * Default: ONE combined cabinet split by a vertical separation panel into two
 * sections (sketch inner dims interpreted in mm → a realistic ~1.9 m vitrine):
 *  - Left section: inner 82 cm, two shelves placed low.
 *  - Right section: inner 178.6 cm, three shelves — highest at 1 m (fixed),
 *    the two lower ones movable.
 *  - Separation panel: 3 cm thick, between the two sections.
 */
function seedLayout(): Layout {
  const panel = DEFAULT_PANEL_THICKNESS
  const left = 0.82
  const right = 1.786
  const innerW = left + panel + right
  const dividerX = left + panel / 2 // panel centre, so left section inner = 82 cm
  const cabinet = cabinetByInner(0, innerW, 1.915, [
    makeShelf(0.3, true, 0),
    makeShelf(0.6, true, 0),
    makeShelf(0.35, true, 1),
    makeShelf(0.65, true, 1),
    makeShelf(1.0, false, 1),
  ])
  cabinet.dividers = [makeDivider(dividerX, panel)]
  return { version: 1, segments: [cabinet], items: [], woodBrightness: 1, glassOpacity: 0.45, glassTint: '#bcdcea', groundOffset: 0, groups: [] }
}

/** Backfill fields that may be missing in older saved/persisted layouts. */
function normalizeLayout(layout: Layout): Layout {
  return {
    version: layout.version ?? 1,
    segments: (layout.segments ?? []).map((s) => ({
      ...s,
      dividers: (s.dividers ?? []).map((dv) => ({
        ...dv,
        thickness: dv.thickness ?? s.frameThickness ?? DEFAULT_PANEL_THICKNESS,
        material: dv.material ?? 'wood',
      })),
      shelves: (s.shelves ?? []).map((sh) => ({
        ...sh,
        movable: sh.movable ?? true,
        compartment: sh.compartment ?? 0,
      })),
    })),
    items: (layout.items ?? []).map((it) => ({
      ...it,
      rotationX: it.rotationX ?? 0,
      attached: it.attached ?? true,
    })),
    woodBrightness: layout.woodBrightness ?? 1,
    glassOpacity: layout.glassOpacity ?? 0.45,
    glassTint: layout.glassTint ?? '#bcdcea',
    groundOffset: layout.groundOffset ?? 0,
    groups: layout.groups ?? [],
  }
}

/** Effective wood brightness for a segment: its own override, else the synced value. */
export function segmentBrightness(layout: Layout, seg: Segment): number {
  return seg.woodBrightness ?? layout.woodBrightness
}

export interface StoreState {
  layout: Layout
  mode: Mode
  transformMode: TransformMode
  selected: Selection | null
  /** True while a palette item is being dragged over the canvas (drop affordance). */
  placing: boolean
  /** Item IDs accumulated by Shift+click for pending group creation. */
  multiSelected: string[]
  /** ID of the item currently open in the detail editor modal (null = closed). */
  editingItemId: string | null

  // --- mode / selection ---
  setMode: (mode: Mode) => void
  setTransformMode: (m: TransformMode) => void
  select: (sel: Selection | null) => void
  setPlacing: (v: boolean) => void
  groupItems: (ids: string[]) => void
  ungroupItems: (groupId: string) => void
  removeItemFromGroup: (itemId: string) => void
  toggleMultiSelect: (itemId: string) => void
  clearMultiSelect: () => void
  openItemEditor: (id: string) => void
  closeItemEditor: () => void
  patchItem: (id: string, patch: Partial<Pick<Item, 'size' | 'rotationY' | 'rotationX' | 'color' | 'labelText'>>) => void

  // --- segments ---
  addSegment: () => void
  removeSegment: (id: string) => void
  resizeSegment: (id: string, dims: Partial<Pick<Segment, 'width' | 'height' | 'depth'>>) => void
  setFrameThickness: (id: string, t: number) => void

  // --- shelves ---
  addShelf: (segmentId: string, compartment?: number) => void
  removeShelf: (segmentId: string, shelfId: string) => void
  setShelfHeight: (segmentId: string, shelfId: string, height: number) => void
  setShelfMovable: (segmentId: string, shelfId: string, movable: boolean) => void
  setShelfHidden: (segmentId: string, shelfId: string, hidden: boolean) => void

  // --- dividers (vertical separation panels) ---
  addDivider: (segmentId: string) => void
  removeDivider: (segmentId: string, dividerId: string) => void
  setDividerX: (segmentId: string, dividerId: string, x: number) => void
  setPanelThickness: (segmentId: string, thickness: number) => void
  setPanelMaterial: (segmentId: string, material: Divider['material']) => void

  // --- items ---
  addItem: (type: ItemType, position: Vec3, shelfId: string | null, imageId?: string) => void
  moveItem: (id: string, position: Vec3, shelfId?: string | null) => void
  resizeItem: (id: string, size: Vec3) => void
  rotateItem: (id: string, rotationY: number) => void
  tiltItem: (id: string, rotationX: number) => void
  setItemAttached: (id: string, attached: boolean) => void
  setItemColor: (id: string, color: string) => void
  setItemLabel: (id: string, text: string) => void
  removeItem: (id: string) => void

  // --- glass appearance (global) ---
  setGlassOpacity: (v: number) => void
  setGlassTint: (color: string) => void

  // --- scene ---
  setGroundOffset: (v: number) => void

  // --- wood brightness (synced / per-cabinet) ---
  setSyncedWoodBrightness: (v: number) => void
  setSegmentWoodBrightness: (id: string, v: number) => void
  setSegmentWoodLinked: (id: string, linked: boolean) => void
  syncAllWood: (v: number) => void

  // --- whole-layout (presets) ---
  loadLayout: (layout: Layout) => void
  resetLayout: () => void
}

function updateSegment(layout: Layout, id: string, fn: (s: Segment) => Segment): Layout {
  return { ...layout, segments: layout.segments.map((s) => (s.id === id ? fn(s) : s)) }
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      layout: seedLayout(),
      mode: 'design',
      transformMode: 'translate',
      selected: null,
      placing: false,
      multiSelected: [],
      editingItemId: null,

      // Preserve a meaningful selection across mode switches: keep a segment
      // selection (or auto-select the first cabinet) when entering Design; keep
      // an item selection (else clear) when entering Place.
      setMode: (mode) =>
        set((s) => {
          if (mode === 'design') {
            const sel =
              s.selected?.kind === 'segment'
                ? s.selected
                : s.layout.segments[0]
                  ? ({ kind: 'segment', id: s.layout.segments[0].id } as Selection)
                  : null
            return { mode, selected: sel, multiSelected: [] }
          }
          if (mode === 'place') {
            return { mode, selected: s.selected?.kind === 'item' ? s.selected : null, multiSelected: [] }
          }
          return { mode, multiSelected: [] } // presets — leave selection untouched
        }),
      setTransformMode: (transformMode) => set({ transformMode }),
      select: (selected) => set({ selected }),
      setPlacing: (placing) => set({ placing }),

      groupItems: (ids) =>
        set((state) => {
          if (ids.length < 2) return state
          const allItems = state.layout.items
          const existingGroupIds = [...new Set(
            ids.map(id => allItems.find(it => it.id === id)?.groupId).filter((g): g is string => !!g)
          )]
          const affectedIds = new Set([
            ...ids,
            ...allItems.filter(it => it.groupId && existingGroupIds.includes(it.groupId)).map(it => it.id),
          ])
          if (existingGroupIds.length === 1) {
            const groupMembers = allItems.filter(it => it.groupId === existingGroupIds[0])
            if (groupMembers.every(it => affectedIds.has(it.id)) && groupMembers.length === affectedIds.size) {
              return { multiSelected: [], selected: { kind: 'group', id: existingGroupIds[0] } }
            }
          }
          const survivorId = existingGroupIds[0] ?? uid()
          const toDissolve = new Set(existingGroupIds.slice(1))
          return {
            multiSelected: [],
            selected: { kind: 'group', id: survivorId },
            layout: {
              ...state.layout,
              groups: [
                ...state.layout.groups.filter(g => g.id !== survivorId && !toDissolve.has(g.id)),
                { id: survivorId },
              ],
              items: allItems.map(it => ({
                ...it,
                groupId: affectedIds.has(it.id) ? survivorId
                  : (it.groupId && toDissolve.has(it.groupId) ? survivorId : it.groupId),
              })),
            },
          }
        }),

      ungroupItems: (groupId) =>
        set((state) => ({
          selected: state.selected?.kind === 'group' && state.selected.id === groupId ? null : state.selected,
          layout: {
            ...state.layout,
            groups: state.layout.groups.filter(g => g.id !== groupId),
            items: state.layout.items.map(it => it.groupId === groupId ? { ...it, groupId: undefined } : it),
          },
        })),

      removeItemFromGroup: (itemId) =>
        set((state) => {
          const item = state.layout.items.find(it => it.id === itemId)
          if (!item?.groupId) return state
          const groupId = item.groupId
          const remaining = state.layout.items.filter(it => it.groupId === groupId && it.id !== itemId)
          if (remaining.length <= 1) {
            return {
              selected: state.selected?.kind === 'group' && state.selected.id === groupId ? null : state.selected,
              layout: {
                ...state.layout,
                groups: state.layout.groups.filter(g => g.id !== groupId),
                items: state.layout.items.map(it => it.groupId === groupId ? { ...it, groupId: undefined } : it),
              },
            }
          }
          return {
            layout: {
              ...state.layout,
              items: state.layout.items.map(it => it.id === itemId ? { ...it, groupId: undefined } : it),
            },
          }
        }),

      toggleMultiSelect: (itemId) =>
        set((state) => {
          const item = state.layout.items.find(it => it.id === itemId)
          if (!item) return state
          const idsToToggle = item.groupId
            ? state.layout.items.filter(it => it.groupId === item.groupId).map(it => it.id)
            : [itemId]
          const allIn = idsToToggle.every(id => state.multiSelected.includes(id))
          return {
            multiSelected: allIn
              ? state.multiSelected.filter(id => !idsToToggle.includes(id))
              : [...state.multiSelected, ...idsToToggle.filter(id => !state.multiSelected.includes(id))],
          }
        }),

      clearMultiSelect: () => set({ multiSelected: [] }),

      openItemEditor: (id) => set({ editingItemId: id }),
      closeItemEditor: () => set({ editingItemId: null }),
      patchItem: (id, patch) =>
        set((state) => ({
          layout: {
            ...state.layout,
            items: state.layout.items.map((it) => {
              if (it.id !== id) return it
              const size: Vec3 = patch.size
                ? [clamp(patch.size[0], 0.01, 3), clamp(patch.size[1], 0.01, 3), clamp(patch.size[2], 0.01, 3)]
                : it.size
              const rotationX = patch.rotationX ?? it.rotationX
              const top = shelfTopForItem(state.layout, it.shelfId)
              const position: Vec3 =
                it.attached && top !== null
                  ? [it.position[0], seatedY(size, rotationX, top), it.position[2]]
                  : it.position
              return { ...it, ...patch, size, rotationX, position }
            }),
          },
        })),

      addSegment: () =>
        set((state) => {
          const segs = state.layout.segments
          const xCenter =
            segs.length === 0
              ? 0
              : Math.max(...segs.map(segRight)) + SEGMENT_GAP + makeSegment(0).width / 2
          const seg = makeSegment(xCenter)
          return { layout: { ...state.layout, segments: [...segs, seg] } }
        }),

      removeSegment: (id) =>
        set((state) => {
          const seg = state.layout.segments.find((s) => s.id === id)
          const shelfIds = new Set(seg?.shelves.map((sh) => sh.id) ?? [])
          return {
            selected: state.selected?.id === id ? null : state.selected,
            layout: {
              ...state.layout,
              segments: state.layout.segments.filter((s) => s.id !== id),
              // orphaned items keep their world position but lose shelf ref
              items: state.layout.items.map((it) =>
                it.shelfId && shelfIds.has(it.shelfId) ? { ...it, shelfId: null } : it,
              ),
            },
          }
        }),

      resizeSegment: (id, dims) =>
        set((state) => ({
          layout: updateSegment(state.layout, id, (s) => {
            const width = clamp(dims.width ?? s.width, 0.1, 5)
            const height = clamp(dims.height ?? s.height, 0.1, 5)
            const depth = clamp(dims.depth ?? s.depth, 0.1, 3)
            const iw = Math.max(0.001, width - 2 * s.frameThickness)
            return {
              ...s,
              width,
              height,
              depth,
              shelves: s.shelves.map((sh) => ({ ...sh, height: clamp(sh.height, 0, height) })),
              dividers: s.dividers.map((dv) => ({ ...dv, x: clamp(dv.x, 0, iw) })),
            }
          }),
        })),

      setFrameThickness: (id, t) =>
        set((state) => ({
          layout: updateSegment(state.layout, id, (s) => {
            // wall thickness is bounded so inner space never collapses
            const maxT = Math.min(s.width, s.depth) / 2 - 0.005
            const frameThickness = clamp(t, 0.005, Math.max(0.005, maxT))
            const iw = Math.max(0.001, s.width - 2 * frameThickness)
            return {
              ...s,
              frameThickness,
              dividers: s.dividers.map((dv) => ({ ...dv, x: clamp(dv.x, 0, iw) })),
            }
          }),
        })),

      addShelf: (segmentId, compartment = 0) =>
        set((state) => ({
          layout: updateSegment(state.layout, segmentId, (s) => ({
            ...s,
            shelves: [...s.shelves, makeShelf(clamp(s.height / 2, 0, s.height), true, compartment)],
          })),
        })),

      removeShelf: (segmentId, shelfId) =>
        set((state) => ({
          layout: {
            ...updateSegment(state.layout, segmentId, (s) => ({
              ...s,
              shelves: s.shelves.filter((sh) => sh.id !== shelfId),
            })),
            items: state.layout.items.map((it) =>
              it.shelfId === shelfId ? { ...it, shelfId: null } : it,
            ),
          } as Layout,
        })),

      setShelfHeight: (segmentId, shelfId, height) =>
        set((state) => {
          const seg = state.layout.segments.find((s) => s.id === segmentId)
          if (!seg) return state
          const sh = seg.shelves.find((x) => x.id === shelfId)
          if (!sh) return state
          const newShelf: Shelf = { ...sh, height: clamp(height, 0, seg.height) }
          const newTop = shelfTopY(seg, newShelf)
          return {
            layout: {
              ...updateSegment(state.layout, segmentId, (s2) => ({
                ...s2,
                shelves: s2.shelves.map((x) => (x.id === shelfId ? newShelf : x)),
              })),
              // attached items ride the shelf as it moves
              items: state.layout.items.map((it) =>
                it.shelfId === shelfId && it.attached
                  ? {
                      ...it,
                      position: [
                        it.position[0],
                        seatedY(it.size, it.rotationX, newTop),
                        it.position[2],
                      ] as Vec3,
                    }
                  : it,
              ),
            } as Layout,
          }
        }),

      setShelfMovable: (segmentId, shelfId, movable) =>
        set((state) => ({
          layout: updateSegment(state.layout, segmentId, (s) => ({
            ...s,
            shelves: s.shelves.map((sh) => (sh.id === shelfId ? { ...sh, movable } : sh)),
          })),
        })),

      setShelfHidden: (segmentId, shelfId, hidden) =>
        set((state) => ({
          layout: {
            ...state.layout,
            segments: state.layout.segments.map((seg) =>
              seg.id !== segmentId ? seg : {
                ...seg,
                shelves: seg.shelves.map((sh) => sh.id !== shelfId ? sh : { ...sh, hidden }),
              }
            ),
          },
        })),

      addDivider: (segmentId) =>
        set((state) => ({
          layout: updateSegment(state.layout, segmentId, (s) => {
            const iw = s.width - 2 * s.frameThickness
            // place the new panel in the middle of the widest existing compartment
            const bounds = [0, ...sortDividers(s.dividers).map((d) => d.x), iw]
            let bestMid = iw / 2
            let bestGap = -1
            for (let i = 0; i < bounds.length - 1; i++) {
              const gap = bounds[i + 1] - bounds[i]
              if (gap > bestGap) {
                bestGap = gap
                bestMid = (bounds[i] + bounds[i + 1]) / 2
              }
            }
            const thickness = s.dividers[0]?.thickness ?? DEFAULT_PANEL_THICKNESS
            const material = s.dividers[0]?.material ?? 'wood'
            return {
              ...s,
              dividers: sortDividers([...s.dividers, makeDivider(bestMid, thickness, material)]),
            }
          }),
        })),

      removeDivider: (segmentId, dividerId) =>
        set((state) => ({
          layout: updateSegment(state.layout, segmentId, (s) => ({
            ...s,
            dividers: s.dividers.filter((d) => d.id !== dividerId),
          })),
        })),

      setDividerX: (segmentId, dividerId, x) =>
        set((state) => ({
          layout: updateSegment(state.layout, segmentId, (s) => {
            const iw = s.width - 2 * s.frameThickness
            return {
              ...s,
              dividers: sortDividers(
                s.dividers.map((d) => (d.id === dividerId ? { ...d, x: clamp(x, 0, iw) } : d)),
              ),
            }
          }),
        })),

      setPanelThickness: (segmentId, thickness) =>
        set((state) => ({
          layout: updateSegment(state.layout, segmentId, (s) => {
            const iw = innerWidth(s)
            const tk = clamp(thickness, 0.005, Math.max(0.005, iw / 2))
            return { ...s, dividers: s.dividers.map((d) => ({ ...d, thickness: tk })) }
          }),
        })),

      setPanelMaterial: (segmentId, material) =>
        set((state) => ({
          layout: updateSegment(state.layout, segmentId, (s) => ({
            ...s,
            dividers: s.dividers.map((d) => ({ ...d, material })),
          })),
        })),

      addItem: (type, position, shelfId, imageId) =>
        set((state) => {
          const item: Item = {
            id: uid(),
            type,
            position,
            rotationY: 0,
            rotationX: 0,
            size:
              type === 'image'
                ? ([0.3, 0.2, 0.01] as Vec3)
                : type === 'label'
                  ? ([0.2, 0.1, 0.005] as Vec3)
                  : ([...DEFAULT_ITEM_SIZE] as Vec3),
            color: type === 'image' || type === 'label' ? '#ffffff' : defaultItemColor,
            imageId,
            labelText: type === 'label' ? '' : undefined,
            shelfId,
            attached: shelfId !== null,
          }
          return {
            layout: { ...state.layout, items: [...state.layout.items, item] },
            selected: { kind: 'item', id: item.id },
          }
        }),

      moveItem: (id, position, shelfId) =>
        set((state) => ({
          layout: {
            ...state.layout,
            items: state.layout.items.map((it) =>
              it.id === id
                ? { ...it, position, shelfId: shelfId === undefined ? it.shelfId : shelfId }
                : it,
            ),
          },
        })),

      resizeItem: (id, size) =>
        set((state) => ({
          layout: {
            ...state.layout,
            items: state.layout.items.map((it) => {
              if (it.id !== id) return it
              const newSize: Vec3 = [
                clamp(size[0], 0.01, 3),
                clamp(size[1], 0.01, 3),
                clamp(size[2], 0.01, 3),
              ]
              const top = shelfTopForItem(state.layout, it.shelfId)
              const position: Vec3 =
                it.attached && top !== null
                  ? [it.position[0], seatedY(newSize, it.rotationX, top), it.position[2]]
                  : it.position
              return { ...it, size: newSize, position }
            }),
          },
        })),

      rotateItem: (id, rotationY) =>
        set((state) => ({
          layout: {
            ...state.layout,
            items: state.layout.items.map((it) => (it.id === id ? { ...it, rotationY } : it)),
          },
        })),

      tiltItem: (id, rotationX) =>
        set((state) => ({
          layout: {
            ...state.layout,
            items: state.layout.items.map((it) => {
              if (it.id !== id) return it
              const top = shelfTopForItem(state.layout, it.shelfId)
              const position: Vec3 =
                it.attached && top !== null
                  ? [it.position[0], seatedY(it.size, rotationX, top), it.position[2]]
                  : it.position
              return { ...it, rotationX, position }
            }),
          },
        })),

      setItemAttached: (id, attached) =>
        set((state) => ({
          layout: {
            ...state.layout,
            items: state.layout.items.map((it) => {
              if (it.id !== id) return it
              if (!attached) return { ...it, attached: false }
              // re-attach: snap to the nearest shelf surface below/at the item
              const surfaces = shelfSurfaces(state.layout)
              if (!surfaces.length) return { ...it, attached: true }
              const half = tiltedHalfHeight(it.size, it.rotationX)
              const nearest = surfaces.reduce((best, s) =>
                Math.abs(s.topY + half - it.position[1]) <
                Math.abs(best.topY + half - it.position[1])
                  ? s
                  : best,
              )
              return {
                ...it,
                attached: true,
                shelfId: nearest.shelfId,
                position: [it.position[0], nearest.topY + half, it.position[2]] as Vec3,
              }
            }),
          },
        })),

      setItemColor: (id, color) =>
        set((state) => ({
          layout: {
            ...state.layout,
            items: state.layout.items.map((it) => (it.id === id ? { ...it, color } : it)),
          },
        })),

      setItemLabel: (id, text) =>
        set((state) => ({
          layout: {
            ...state.layout,
            items: state.layout.items.map((it) => (it.id === id ? { ...it, labelText: text } : it)),
          },
        })),

      removeItem: (id) =>
        set((state) => {
          const item = state.layout.items.find((it) => it.id === id)
          const groupId = item?.groupId
          const remaining = groupId
            ? state.layout.items.filter((it) => it.groupId === groupId && it.id !== id)
            : []
          const dissolveGroup = groupId !== undefined && remaining.length <= 1
          return {
            selected:
              state.selected?.id === id
                ? null
                : dissolveGroup && state.selected?.kind === 'group' && state.selected.id === groupId
                  ? null
                  : state.selected,
            layout: {
              ...state.layout,
              groups: dissolveGroup
                ? state.layout.groups.filter((g) => g.id !== groupId)
                : state.layout.groups,
              items: state.layout.items
                .filter((it) => it.id !== id)
                .map((it) =>
                  dissolveGroup && it.groupId === groupId ? { ...it, groupId: undefined } : it,
                ),
            },
          }
        }),

      setGlassOpacity: (v) =>
        set((state) => ({
          layout: { ...state.layout, glassOpacity: clamp(v, 0.05, 0.9) },
        })),

      setGlassTint: (color) =>
        set((state) => ({
          layout: { ...state.layout, glassTint: color },
        })),

      setGroundOffset: (v) =>
        set((state) => ({
          layout: { ...state.layout, groundOffset: clamp(v, 0, 2) },
        })),

      setSyncedWoodBrightness: (v) =>
        set((state) => ({
          layout: { ...state.layout, woodBrightness: clamp(v, 0.4, 1.6) },
        })),

      setSegmentWoodBrightness: (id, v) =>
        set((state) => ({
          layout: updateSegment(state.layout, id, (s) => ({
            ...s,
            woodBrightness: clamp(v, 0.4, 1.6),
          })),
        })),

      setSegmentWoodLinked: (id, linked) =>
        set((state) => ({
          layout: updateSegment(state.layout, id, (s) => ({
            ...s,
            // linked → drop the override (use synced); unlinked → freeze current value
            woodBrightness: linked ? undefined : (s.woodBrightness ?? state.layout.woodBrightness),
          })),
        })),

      syncAllWood: (v) =>
        set((state) => ({
          layout: {
            ...state.layout,
            woodBrightness: clamp(v, 0.4, 1.6),
            segments: state.layout.segments.map((s) => ({ ...s, woodBrightness: undefined })),
          },
        })),

      loadLayout: (layout) => set({ layout: normalizeLayout(layout), selected: null }),
      resetLayout: () => set({ layout: seedLayout(), selected: null }),
    }),
    {
      name: 'vitrine:working',
      version: 2,
      partialize: (state) => ({ layout: state.layout }),
      migrate: (persisted) => {
        const p = persisted as { layout?: Layout } | undefined
        if (p?.layout) p.layout = normalizeLayout(p.layout)
        return p as never
      },
    },
  ),
)

// Dev-only handle for automated/manual testing in the browser console.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __store?: typeof useStore }).__store = useStore
}

// ---- selectors / helpers (outside the store to avoid re-renders) ----

export interface ShelfSurface {
  segmentId: string
  shelfId: string
  /** World Y of the shelf's top surface. */
  topY: number
  /** World X extent of the shelf (its compartment), used to keep moves in-section. */
  xMin: number
  xMax: number
}

/** All shelf top surfaces across the layout, used for drop / move snapping. */
export function shelfSurfaces(layout: Layout): ShelfSurface[] {
  const out: ShelfSurface[] = []
  for (const seg of layout.segments) {
    const comps = compartments(seg)
    for (const sh of seg.shelves) {
      const comp = comps[Math.min(sh.compartment ?? 0, comps.length - 1)]
      const worldX = seg.position[0] + localX(seg, comp.centerFx)
      out.push({
        segmentId: seg.id,
        shelfId: sh.id,
        topY: seg.position[1] + sh.height + sh.thickness / 2,
        xMin: worldX - comp.width / 2,
        xMax: worldX + comp.width / 2,
      })
    }
  }
  return out
}

export function findItem(layout: Layout, id: string): Item | undefined {
  return layout.items.find((it) => it.id === id)
}

export interface ShelfRef {
  segment: Segment
  shelf: Shelf
}

export function findShelf(layout: Layout, shelfId: string): ShelfRef | undefined {
  for (const segment of layout.segments) {
    const shelf = segment.shelves.find((sh) => sh.id === shelfId)
    if (shelf) return { segment, shelf }
  }
  return undefined
}

/** World Y of the top surface of the shelf an item rests on (null if none). */
function shelfTopForItem(layout: Layout, shelfId: string | null): number | null {
  if (!shelfId) return null
  const ref = findShelf(layout, shelfId)
  return ref ? shelfTopY(ref.segment, ref.shelf) : null
}

export function findSegment(layout: Layout, id: string): Segment | undefined {
  return layout.segments.find((s) => s.id === id)
}
