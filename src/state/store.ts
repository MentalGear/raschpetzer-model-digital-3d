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

function makeShelf(height: number): Shelf {
  return { id: uid(), height, thickness: 0.01 }
}

function makeDivider(x: number): Divider {
  return { id: uid(), x }
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

/** Right edge X of a segment in world space. */
const segRight = (s: Segment): number => s.position[0] + s.width / 2

function seedLayout(): Layout {
  return { version: 1, segments: [makeSegment(0)], items: [] }
}

/** Backfill fields that may be missing in older saved/persisted layouts. */
function normalizeLayout(layout: Layout): Layout {
  return {
    version: layout.version ?? 1,
    segments: (layout.segments ?? []).map((s) => ({ ...s, dividers: s.dividers ?? [] })),
    items: layout.items ?? [],
  }
}

export interface StoreState {
  layout: Layout
  mode: Mode
  transformMode: TransformMode
  selected: Selection | null

  // --- mode / selection ---
  setMode: (mode: Mode) => void
  setTransformMode: (m: TransformMode) => void
  select: (sel: Selection | null) => void

  // --- segments ---
  addSegment: () => void
  removeSegment: (id: string) => void
  resizeSegment: (id: string, dims: Partial<Pick<Segment, 'width' | 'height' | 'depth'>>) => void

  // --- shelves ---
  addShelf: (segmentId: string) => void
  removeShelf: (segmentId: string, shelfId: string) => void
  setShelfHeight: (segmentId: string, shelfId: string, height: number) => void

  // --- dividers (vertical separation panels) ---
  addDivider: (segmentId: string) => void
  removeDivider: (segmentId: string, dividerId: string) => void
  setDividerX: (segmentId: string, dividerId: string, x: number) => void

  // --- items ---
  addItem: (type: ItemType, position: Vec3, shelfId: string | null) => void
  moveItem: (id: string, position: Vec3, shelfId?: string | null) => void
  resizeItem: (id: string, size: Vec3) => void
  rotateItem: (id: string, rotationY: number) => void
  setItemColor: (id: string, color: string) => void
  removeItem: (id: string) => void

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

      setMode: (mode) => set({ mode, selected: null }),
      setTransformMode: (transformMode) => set({ transformMode }),
      select: (selected) => set({ selected }),

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

      addShelf: (segmentId) =>
        set((state) => ({
          layout: updateSegment(state.layout, segmentId, (s) => ({
            ...s,
            shelves: [...s.shelves, makeShelf(clamp(s.height / 2, 0, s.height))],
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
        set((state) => ({
          layout: updateSegment(state.layout, segmentId, (s) => ({
            ...s,
            shelves: s.shelves.map((sh) =>
              sh.id === shelfId ? { ...sh, height: clamp(height, 0, s.height) } : sh,
            ),
          })),
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
            return { ...s, dividers: sortDividers([...s.dividers, makeDivider(bestMid)]) }
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

      addItem: (type, position, shelfId) =>
        set((state) => {
          const item: Item = {
            id: uid(),
            type,
            position,
            rotationY: 0,
            size: [...DEFAULT_ITEM_SIZE] as Vec3,
            color: defaultItemColor,
            shelfId,
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
            items: state.layout.items.map((it) =>
              it.id === id
                ? {
                    ...it,
                    size: [
                      clamp(size[0], 0.01, 3),
                      clamp(size[1], 0.01, 3),
                      clamp(size[2], 0.01, 3),
                    ] as Vec3,
                  }
                : it,
            ),
          },
        })),

      rotateItem: (id, rotationY) =>
        set((state) => ({
          layout: {
            ...state.layout,
            items: state.layout.items.map((it) => (it.id === id ? { ...it, rotationY } : it)),
          },
        })),

      setItemColor: (id, color) =>
        set((state) => ({
          layout: {
            ...state.layout,
            items: state.layout.items.map((it) => (it.id === id ? { ...it, color } : it)),
          },
        })),

      removeItem: (id) =>
        set((state) => ({
          selected: state.selected?.id === id ? null : state.selected,
          layout: { ...state.layout, items: state.layout.items.filter((it) => it.id !== id) },
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

// ---- selectors / helpers (outside the store to avoid re-renders) ----

export interface ShelfSurface {
  segmentId: string
  shelfId: string
  /** World Y of the shelf's top surface. */
  topY: number
}

/** All shelf top surfaces across the layout, used for drop / move snapping. */
export function shelfSurfaces(layout: Layout): ShelfSurface[] {
  const out: ShelfSurface[] = []
  for (const seg of layout.segments) {
    for (const sh of seg.shelves) {
      out.push({
        segmentId: seg.id,
        shelfId: sh.id,
        topY: seg.position[1] + sh.height + sh.thickness / 2,
      })
    }
  }
  return out
}

export function findItem(layout: Layout, id: string): Item | undefined {
  return layout.items.find((it) => it.id === id)
}

export function findSegment(layout: Layout, id: string): Segment | undefined {
  return layout.segments.find((s) => s.id === id)
}
