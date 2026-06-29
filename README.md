# Vitrine Simulator — Museum Showcase Layout Tool

A browser-based 3D simulator for pre-visualising **museum showcase (vitrine)** layouts at real
metric scale before building or filling a physical case. Design wooden display cabinets, adjust
glass shelves, drag items onto shelves, and resize everything with **live centimetre dimension
arrows**.

Built with **React Three Fiber · drei · zustand · Vite · TypeScript**, run with **Bun**.

## Getting started

```bash
bun install
bun run dev        # http://localhost:5173
bun run build      # type-check + production bundle → dist/
bun run preview    # preview the production build
```

## Modes

| Mode | What it does |
|---|---|
| **Design shelf** | Add/remove cabinet segments; resize width, height, depth; add/remove glass shelves and drag their height. |
| **Place items** | Drag primitives from the palette onto shelves; select to move, rotate, resize, recolour, or delete. |
| **Presets** | Save and restore complete named layouts to the browser (localStorage). |

## Features

### Cabinet design
- Multi-segment showcases — add, remove, and resize segments side-by-side.
- Parametric wood frame (sides, back, top, bottom) and translucent glass shelves.
- Adjustable glass opacity and tint per layout.
- Combined cabinet with configurable divider thickness and per-compartment shelves.
- Separation panels can be wood or glass.
- Per-cabinet brightness control; optional sync across all segments.
- Drag the in-scene vertical gizmo or type an exact cm value to set shelf height — all items on that shelf follow.

### Item placement
- Primitives: box, cylinder, sphere, cone, torus, image frame, label card.
- **Image items** — upload a PNG/JPG (stored as IndexedDB data URLs); displayed on a flat plane.
- **Label items** — editable text with configurable font size; renders as a canvas texture.
- Drag from the palette; drops onto the nearest shelf surface with XZ grid snap.
- **Attach / Float** toggle — attached items ride with their shelf; floating items stay fixed.
- **Tilt (X rotation)** — lean items forward/back (e.g. lay flat, stand upright).
- Move, Rotate, Resize via in-scene gizmo (TransformControls) or the Properties panel.
- **Live cm dimension arrows** — W/H/D labels update in real time while resizing.
- **Item detail editor** — double-click any item for a full-screen modal with its own undo/redo stack and a live 3D preview.

### Multi-select and grouping
- **Shift-click** to multi-select items.
- **Align tools** — align left/centre/right edges, front/centre/back depth, bottom/middle/top height.
- **Group** selected items — the group gizmo moves all members together while preserving shelf seating for attached items.
- **Ungroup**, or remove individual items from a group, in the Properties panel.

### Keyboard shortcuts
| Key | Action |
|---|---|
| `D` | Design mode |
| `P` | Place mode |
| `V` | Toggle plan view (top-down) |
| `Ctrl/⌘+Z` / `Ctrl/⌘+Y` | Global undo / redo |
| `Ctrl/⌘+D` | Duplicate selected item |
| `Delete` / `Backspace` | Remove selected item or segment |
| `←↑↓→` / `PgUp/PgDn` | Nudge item 1 cm (hold Shift → 10 cm) |

### Views and cameras
- **Perspective** (default), **Plan** (top-down ortho), **Front** (elevation ortho).
- **Named camera views** — save and restore perspective camera positions from the toolbar (🎥 Views).

### Layout presets
- Type a preset name in the Presets panel, Save, and the full layout is written to `localStorage`.
- Load or delete named presets anytime; the working draft auto-saves separately via zustand persist.

### Display options
- Dark / light canvas theme toggle.
- Human scale cutout toggle (shows silhouettes for scale reference).
- Grid cell size picker (2 cm → 20 cm).

## Project layout

```
src/
  state/
    types.ts          — Layout, Segment, Shelf, Item types (fully serialisable)
    store.ts          — zustand store + persist; all scene mutations
    historyStore.ts   — global undo/redo middleware
    viewStore.ts      — named camera views (persist)
    presets.ts        — named layout presets (localStorage)
    units.ts          — m↔cm helpers, snapGrid
    imageStore.ts     — image data URLs (IndexedDB via idb-keyval)
  scene/
    Showcase.tsx      — renders all segments + group gizmo
    Segment.tsx       — parametric wood/glass cabinet from state
    Shelf.tsx         — glass shelf panel at a height
    Item.tsx          — placed primitive (geometry + material + gizmo)
    primitives.ts     — primitive type registry
    DimensionArrows.tsx — live W/H/D cm arrows
    CameraRig.tsx     — lights, grid, OrbitControls, named-view load/capture
    SceneBridge.tsx   — exposes R3F camera/scene to App for DnD raycasting
  ui/
    Toolbar.tsx       — mode tabs, undo/redo, view toggles, Views popover
    SidePanel.tsx     — left palette (Place mode) or Design/Presets panel
    DesignPanel.tsx   — segment list and shelf editor
    ItemPalette.tsx   — draggable primitive chips
    PropertiesPanel.tsx — selected item/group/shelf: size, rotation, colour, align
    ItemEditorModal.tsx — full-screen item detail editor with local undo/redo
    PresetBar.tsx     — named layout save/load/delete
    NumberField.tsx   — cm input field (stores metres internally)
    theme.ts          — zustand theme store (dark/light, plan/front view, grid)
```

## Architecture notes

- **1 three.js unit = 1 metre.** All state stored in metres; UI shows centimetres (`×100`).
- **Parametric geometry** — segments and shelves rebuild from numeric state so frame thickness never distorts under resize.
- **Fully serialisable state** — `Layout` is a plain JSON object; presets are direct `JSON.stringify` of it.
- **Image storage** — uploaded images stored as data URLs in IndexedDB (`idb-keyval`), referenced by UUID in layout state, so presets remain JSON-clean.
- **Global undo/redo** — `historyStore.ts` wraps `store.ts` mutations; `Ctrl+Z/Y` replay the store diff.
- **Item editor undo/redo** — separate `useReducer` with `past/present/future`; committed to global store only on Save.
- **Named views** — transient `pendingLoad`/`pendingCaptureName` flags consumed by `CameraRig` inside the R3F Canvas context where `useThree` is accessible.
