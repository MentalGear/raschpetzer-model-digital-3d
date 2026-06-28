# Vitrine Simulator — Museum Showcase Layout Tool

A browser-based 3D simulator for pre-visualising **museum showcase (vitrine)** layouts at real
metric scale. Design a wooden display cabinet, adjust its glass shelves, drag primitive items
onto the shelves, and resize anything with **live centimetre dimension arrows** — then save and
reload named layout presets.

Built with **React Three Fiber + drei + zustand + Vite + TypeScript**, run with **Bun**.

## Features

- **Two modes** (toolbar):
  - **Design shelf** — add/remove wooden cabinet segments, resize width/height/depth (cm),
    add/remove glass shelves and slide their height.
  - **Place items** — drag primitives (box, cylinder, sphere, cone, torus) from the palette
    onto a shelf; select to move, rotate, resize, recolour or delete.
- **Live metric dimension arrows** — selecting/resizing shows W/H/D arrows with live `cm` labels.
- **Wood frame, glass shelves** — solid wood panels (sides/back/top/bottom), translucent glass shelves.
- **Named presets** — type your name, save the full layout to the browser (localStorage), reload anytime.
- **Metric-accurate** — 1 three.js unit = 1 metre; all UI values are centimetres.

## Getting started

```bash
bun install
bun run dev        # http://localhost:5173
```

Other scripts:

```bash
bun run build      # type-check + production build to dist/
bun run preview    # preview the production build
```

## Controls

- **Orbit / zoom:** drag / scroll in the canvas.
- **Select:** click a cabinet (Design mode) or item (Place mode); click empty space to deselect.
- **Move/Rotate/Resize an item:** select it, pick the tool in the Properties panel, drag the gizmo.
  The Properties panel also has exact `cm` inputs.
- **Delete:** select, then press `Delete` / `Backspace` (or use the panel button).

## Reproducible environment (devcontainer)

`.devcontainer/devcontainer.json` provisions Node 22 + Bun, runs `bun install`, and (best-effort)
installs the Chromium used for browser verification. On a fresh clone or container rebuild the
toolchain and dependencies come back automatically; port `5173` is forwarded for the dev server.

## Project layout

```
src/
  state/   types, units (m<->cm), zustand store (+persist), localStorage presets
  scene/   R3F scene: Segment (wood+glass), Item (+scale gizmo), DimensionArrows, CameraRig
  ui/      Toolbar, PresetBar, DesignPanel, ItemPalette, PropertiesPanel
```

## Out of scope (v1)

Realistic textures/lighting, real artifact glTF models or upload, physics/collision, a backend or
multi-user collaboration, undo/redo, VR.
