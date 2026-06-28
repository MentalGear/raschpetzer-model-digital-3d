import { Grid, OrbitControls } from '@react-three/drei'

/** Lights, ground grid and orbit camera. OrbitControls is the default controls
 *  so drei's TransformControls auto-pauses it while dragging a gizmo. */
export function CameraRig() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <hemisphereLight intensity={0.4} groundColor="#888" />
      <directionalLight
        position={[3, 6, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <Grid
        args={[20, 20]}
        cellSize={0.1}
        cellThickness={0.5}
        sectionSize={1}
        sectionThickness={1}
        sectionColor="#7a7a7a"
        cellColor="#c0c0c0"
        infiniteGrid
        fadeDistance={18}
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
