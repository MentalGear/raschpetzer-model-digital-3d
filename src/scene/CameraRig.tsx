import { ContactShadows, Grid, OrbitControls } from '@react-three/drei'
import { useTheme } from '../ui/theme'

/** Lights, ground grid, contact shadow and orbit camera. OrbitControls is the
 *  default controls so drei's TransformControls auto-pauses it while dragging. */
export function CameraRig() {
  const dark = useTheme((s) => s.theme === 'dark')

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
        cellSize={0.1}
        cellThickness={0.6}
        cellColor={dark ? '#2c3543' : '#d3dae1'}
        sectionSize={0.5}
        sectionThickness={1.1}
        sectionColor={dark ? '#46566b' : '#9aa6b4'}
        infiniteGrid
        fadeDistance={26}
        fadeStrength={1.2}
        position={[0, 0, 0]}
      />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        maxPolarAngle={Math.PI / 2}
        target={[0, 0.9, 0]}
      />
    </>
  )
}
