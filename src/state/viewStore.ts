import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Vec3 } from './types'

export interface NamedView {
  name: string
  position: Vec3
  target: Vec3
}

interface ViewStoreState {
  views: NamedView[]
  /** Set by Toolbar → consumed by CameraRig to physically move the camera. */
  pendingLoad: NamedView | null
  /** Set by Toolbar → consumed by CameraRig to read and store current camera state. */
  pendingCaptureName: string | null
  saveView: (name: string, position: Vec3, target: Vec3) => void
  requestCapture: (name: string) => void
  clearCapture: () => void
  requestLoad: (name: string) => void
  clearLoad: () => void
  deleteView: (name: string) => void
}

export const useViewStore = create<ViewStoreState>()(
  persist(
    (set) => ({
      views: [],
      pendingLoad: null,
      pendingCaptureName: null,
      saveView: (name, position, target) =>
        set((s) => ({
          views: [...s.views.filter((v) => v.name !== name), { name, position, target }],
        })),
      requestCapture: (name) => set({ pendingCaptureName: name }),
      clearCapture: () => set({ pendingCaptureName: null }),
      requestLoad: (name) =>
        set((s) => ({ pendingLoad: s.views.find((v) => v.name === name) ?? null })),
      clearLoad: () => set({ pendingLoad: null }),
      deleteView: (name) => set((s) => ({ views: s.views.filter((v) => v.name !== name) })),
    }),
    {
      name: 'vitrine-views',
      partialize: (s) => ({ views: s.views }),
    },
  ),
)
