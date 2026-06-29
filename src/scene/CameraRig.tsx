import { ContactShadows, Grid, OrbitControls, OrthographicCamera } from '@react-three/drei'
import { useTheme } from '../ui/theme'
import { useStore } from '../state/store'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'

/** Lights, ground grid, contact shadow and orbit camera. OrbitControls is the
 *  default controls so drei's TransformControls auto-pauses it while dragging. */
export function CameraRig() {
  const dark = useTheme((s) => s.theme === 'dark')
  const itemSelected = useStore((s) => s.selected?.kind === 'item')
  const planView = useTheme((s) => s.planView)
  const frontView = useTheme((s) => s.frontView)
  const gridSize = useTheme((s) => s.gridSize)

  const { camera, controls } = useThree()

  const prevPlanView = useRef(planView)
  useEffect(() => {
    const wasActive = prevPlanView.current
    prevPlanView.current = planView
    if (wasActive && !planView) {
      camera.position.set(4.6, 3.0, 6.2)
      if (controls && 'target' in controls) {
        ;(controls as any).target.set(0, 1.0, 0)
        ;(controls as any).update()
      }
    }
  }, [planView, camera, controls])

  const prevFrontView = useRef(frontView)
  useEffect(() => {
    const wasActive = prevFrontView.current
    prevFrontView.current = frontView
    if (wasActive && !frontView) {
      camera.position.set(4.6, 3.0, 6.2)
      if (controls && 'target' in controls) {
        ;(controls as any).target.set(0, 1.0, 0)
        ;(controls as any).update()
      }
    }
  }, [frontView, camera, controls])

  return (
    <>
      {/* soft, layered lighting so the cabinet interior + glass shelves stay legible */}
      <ambientLight intensity={0.5} />
      <hemisphereLight intensity={0.6} color="#ffffff" groundColor="#b9b0a4" />
      <directionalLight
        position={[3.5, 6, 4]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0002}
      />
      {/* fill light from the front-left to lift shadowed interior faces */}
      <directionalLight position={[-3, 2.5, 3]} intensity={0.35} />

      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={dark ? 0.5 : 0.35}
        scale={12}
        blur={1.6}
        far={4}
        color="#000000"
      />

      <Grid
        args={[24, 24]}
        cellSize={gridSize}
        cellThickness={0.6}
        cellColor={dark ? '#2c3543' : '#d3dae1'}
        sectionSize={gridSize * 5}
        sectionThickness={1.1}
        sectionColor={dark ? '#46566b' : '#9aa6b4'}
        infiniteGrid
        fadeDistance={26}
        fadeStrength={1.2}
        position={[0, 0, 0]}
      />

      {planView ? (
        <>
          <OrthographicCamera
            makeDefault
            position={[0, 12, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            zoom={150}
            near={0.01}
            far={200}
          />
          <OrbitControls
            makeDefault
            enableRotate={false}
            screenSpacePanning={true}
            minZoom={10}
            maxZoom={400}
            panSpeed={0.5}
            mouseButtons={{
              LEFT: THREE.MOUSE.PAN,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.PAN,
            }}
          />
        </>
      ) : frontView ? (
        <>
          <OrthographicCamera
            makeDefault
            position={[0, 1.2, 16]}
            rotation={[0, 0, 0]}
            zoom={150}
            near={0.01}
            far={200}
          />
          <OrbitControls
            makeDefault
            enableRotate={false}
            screenSpacePanning={true}
            target={[0, 1.0, 0]}
            minZoom={10}
            maxZoom={400}
            panSpeed={0.5}
            mouseButtons={{
              LEFT: THREE.MOUSE.PAN,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.PAN,
            }}
          />
        </>
      ) : (
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          maxPolarAngle={Math.PI / 2}
          target={[0, 1.0, 0]}
          keys={itemSelected ? { LEFT: '', UP: '', RIGHT: '', BOTTOM: '' } as never : undefined}
        />
      )}
    </>
  )
}
