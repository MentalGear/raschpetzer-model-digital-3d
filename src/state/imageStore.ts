import { create } from 'zustand'
import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys, createStore } from 'idb-keyval'

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

/** Dedicated IndexedDB store — survives page reloads. */
const DB = createStore('vitrine-images', 'blobs')

interface ImageStoreState {
  /** id → object URL (in-memory handle; regenerated from IDB on load) */
  images: Record<string, string>
  /** true once the initial IDB load completes */
  ready: boolean
  addImage: (dataURL: string) => Promise<string>
  removeImage: (id: string) => Promise<void>
}

export const useImageStore = create<ImageStoreState>((set) => ({
  images: {},
  ready: false,

  addImage: async (dataURL) => {
    const id = uid()
    // Convert dataURL → Blob (33% smaller than base64 string in IDB)
    const blob = await fetch(dataURL).then((r) => r.blob())
    await idbSet(id, blob, DB)
    const url = URL.createObjectURL(blob)
    set((s) => ({ images: { ...s.images, [id]: url } }))
    return id
  },

  removeImage: async (id) => {
    const existing = useImageStore.getState().images[id]
    if (existing) URL.revokeObjectURL(existing)
    await idbDel(id, DB)
    set((s) => {
      const { [id]: _removed, ...rest } = s.images
      return { images: rest }
    })
  },
}))

/** Restore all persisted images from IndexedDB on startup. */
;(async () => {
  const ids = (await idbKeys(DB)) as string[]
  const entries: Record<string, string> = {}
  for (const id of ids) {
    const blob = await idbGet<Blob>(id, DB)
    if (blob) entries[id] = URL.createObjectURL(blob)
  }
  useImageStore.setState({ images: entries, ready: true })
})()
