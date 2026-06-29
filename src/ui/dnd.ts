/** MIME type used to carry item data from the palette into the canvas. */
export const ITEM_DND_MIME = 'application/x-vitrine-item'

/** Half-height (metres) used to seat a freshly dropped default-sized item. */
export const DEFAULT_DROP_HALF_HEIGHT = 0.1

export interface DndPayload {
  type: string
  imageId?: string
}

export function encodeDnd(type: string, imageId?: string): string {
  return JSON.stringify({ type, imageId })
}

export function decodeDnd(raw: string): DndPayload {
  try {
    return JSON.parse(raw) as DndPayload
  } catch {
    return { type: raw }
  }
}
