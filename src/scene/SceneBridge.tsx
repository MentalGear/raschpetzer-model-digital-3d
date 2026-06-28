import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { RootState } from '@react-three/fiber'

/** Exposes the live three.js state getter to code outside the Canvas (App's
 *  drop handler needs the camera/scene/raycaster to project palette drops). */
export function SceneBridge({ getterRef }: { getterRef: React.MutableRefObject<(() => RootState) | null> }) {
  const get = useThree((s) => s.get)
  useEffect(() => {
    getterRef.current = get
    return () => {
      getterRef.current = null
    }
  }, [get, getterRef])
  return null
}
