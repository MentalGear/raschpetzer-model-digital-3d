import { create } from 'zustand'

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

interface ImageStoreState {
  /** Map of imageId → data URL. Session-only; not persisted to localStorage. */
  images: Record<string, string>
  addImage: (dataURL: string) => string
  removeImage: (id: string) => void
}

export const useImageStore = create<ImageStoreState>((set) => ({
  images: {},
  addImage: (dataURL) => {
    const id = uid()
    set((s) => ({ images: { ...s.images, [id]: dataURL } }))
    return id
  },
  removeImage: (id) =>
    set((s) => {
      const { [id]: _removed, ...rest } = s.images
      return { images: rest }
    }),
}))
