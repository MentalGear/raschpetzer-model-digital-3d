import { create } from 'zustand'
import { useStore } from './store'
import type { Layout } from './types'

const MAX = 60

interface HistoryMeta {
  canUndo: boolean
  canRedo: boolean
}

export const useHistoryStore = create<HistoryMeta>(() => ({ canUndo: false, canRedo: false }))

const past: Layout[] = []
const future: Layout[] = []
let isUndoRedo = false

function sync() {
  useHistoryStore.setState({ canUndo: past.length > 0, canRedo: future.length > 0 })
}

// Track layout changes and snapshot before each one.
let prevLayout: Layout = useStore.getState().layout
useStore.subscribe((state) => {
  if (isUndoRedo) return
  const { layout } = state
  if (layout !== prevLayout) {
    past.push(prevLayout)
    if (past.length > MAX) past.shift()
    future.length = 0
    prevLayout = layout
    sync()
  }
})

export function undo() {
  const prev = past.pop()
  if (!prev) return
  isUndoRedo = true
  future.push(useStore.getState().layout)
  useStore.setState({ layout: prev })
  prevLayout = prev
  isUndoRedo = false
  sync()
}

export function redo() {
  const next = future.pop()
  if (!next) return
  isUndoRedo = true
  past.push(useStore.getState().layout)
  useStore.setState({ layout: next })
  prevLayout = next
  isUndoRedo = false
  sync()
}

/** Reset history after a preset load so undo can't reach the previous session. */
export function clearHistory() {
  past.length = 0
  future.length = 0
  prevLayout = useStore.getState().layout
  sync()
}
