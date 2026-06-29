import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Html, TransformControls } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { Item as ItemT, Vec3 } from '../state/types'
import { seatedY, shelfSurfaces, useStore } from '../state/store'
import { useImageStore } from '../state/imageStore'
import { snapGrid } from '../state/units'
import { PrimitiveGeometry } from './primitives'
import { DimensionArrows } from './DimensionArrows'
import { useTheme } from '../ui/theme'

interface ItemProps {
  item: ItemT
}

export function Item({ item }: ItemProps) {
  const [obj, setObj] = useState<THREE.Group | null>(null)
  const mode = useStore((s) => s.mode)
  const transformMode = useStore((s) => s.transformMode)

  const imageDataUrl = useImageStore((s) => (item.type === 'image' ? (s.images[item.imageId ?? ''] ?? null) : null))
  const imageTexture = useMemo(() => {
    if (!imageDataUrl) return null
    const tex = new THREE.TextureLoader().load(imageDataUrl)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [imageDataUrl])

  const labelTexture = useMemo(() => {
    if (item.type !== 'label') return null
    const W = 512, H = 256
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#f8f5ec'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = '#c8b99a'
    ctx.lineWidth = 4
    ctx.strokeRect(8, 8, W - 16, H - 16)
    const text = item.labelText ?? ''
    if (text) {
      ctx.fillStyle = '#1a1005'
      ctx.font = 'bold 30px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const words = text.split(' ')
      const lines: string[] = []
      let cur = ''
      const maxW = W - 56
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word
        if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = word }
        else cur = test
      }
      if (cur) lines.push(cur)
      const lineH = 38
      const startY = H / 2 - ((lines.length - 1) * lineH) / 2
      for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], W / 2, startY + i * lineH)
    } else {
      ctx.fillStyle = '#b0a080'
      ctx.font = 'italic 26px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Label text…', W / 2, H / 2)
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [item.type, item.labelText])

  const isItemSelected = useStore((s) => s.selected?.kind === 'item' && s.selected.id === item.id)
  const isInSelectedGroup = useStore((s) =>
    !!item.groupId && s.selected?.kind === 'group' && s.selected.id === item.groupId
  )
  const isMultiSelected = useStore((s) => s.multiSelected.includes(item.id))

  const shelfHidden = useStore((s) => {
    if (!item.shelfId) return false
    for (const seg of s.layout.segments) {
      const sh = seg.shelves.find((sh) => sh.id === item.shelfId)
      if (sh) return sh.hidden ?? false
    }
    return false
  })

  const planView = useTheme((s) => s.planView)
  const frontView = useTheme((s) => s.frontView)

  const select = useStore((s) => s.select)
  const moveItem = useStore((s) => s.moveItem)
  const resizeItem = useStore((s) => s.resizeItem)
  const rotateItem = useStore((s) => s.rotateItem)
  const toggleMultiSelect = useStore((s) => s.toggleMultiSelect)
  const clearMultiSelect = useStore((s) => s.clearMultiSelect)

  if (shelfHidden) return null

  const interactive = mode === 'place'
  const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onSelect = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return
    e.stopPropagation()
    if (e.nativeEvent.shiftKey) {
      toggleMultiSelect(item.id)
      return
    }
    clearMultiSelect()
    if (item.groupId) {
      select({ kind: 'group', id: item.groupId })
    } else {
      select({ kind: 'item', id: item.id })
    }
  }

  const handleChange = () => {
    if (!obj) return
    if (dragTimer.current) clearTimeout(dragTimer.current)
    dragTimer.current = setTimeout(() => {
      if (!obj) return
      if (transformMode === 'scale') {
        resizeItem(item.id, [obj.scale.x, obj.scale.y, obj.scale.z])
      } else if (transformMode === 'rotate') {
        rotateItem(item.id, obj.rotation.y)
      } else if (item.attached) {
        const surfaces = shelfSurfaces(useStore.getState().layout)
        let pos: Vec3 = [snapGrid(obj.position.x), obj.position.y, snapGrid(obj.position.z)]
        let shelfId = item.shelfId
        const inSection = surfaces.filter(
          (s) => obj.position.x >= s.xMin && obj.position.x <= s.xMax,
        )
        const pool = inSection.length ? inSection : surfaces
        if (pool.length) {
          const seatFor = (topY: number) => seatedY(item.size, item.rotationX, topY)
          const nearest = pool.reduce((best, s) =>
            Math.abs(seatFor(s.topY) - obj.position.y) < Math.abs(seatFor(best.topY) - obj.position.y)
              ? s
              : best,
          )
          pos = [pos[0], seatFor(nearest.topY), pos[2]]
          shelfId = nearest.shelfId
        }
        moveItem(item.id, pos, shelfId)
      } else {
        moveItem(item.id, [snapGrid(obj.position.x), obj.position.y, snapGrid(obj.position.z)], null)
      }
    }, 16)
  }

  const showY = transformMode === 'scale' || (transformMode === 'translate' && !item.attached)

  const content = (
    <group
      ref={setObj}
      name={`item:${item.id}`}
      position={item.position}
      rotation={[item.rotationX, item.rotationY, 0]}
      scale={item.size}
      onPointerDown={onSelect}
    >
      <mesh castShadow receiveShadow>
        <PrimitiveGeometry type={item.type} />
        {item.type === 'image' ? (
          <meshStandardMaterial
            map={imageTexture ?? undefined}
            color={imageTexture ? '#ffffff' : '#888888'}
            roughness={0.3}
            metalness={0}
          />
        ) : item.type === 'label' ? (
          <meshStandardMaterial
            map={labelTexture ?? undefined}
            color="#ffffff"
            roughness={0.4}
            metalness={0}
          />
        ) : (
          <meshStandardMaterial color={item.color} roughness={0.5} metalness={0.1} />
        )}
      </mesh>
    </group>
  )

  const tagY = item.position[1] + item.size[1] / 2 + 0.07

  return (
    <>
      {isItemSelected && obj ? (
        <TransformControls
          object={obj}
          mode={transformMode}
          showX={transformMode !== 'rotate'}
          showY={showY}
          showZ={transformMode !== 'rotate'}
          onObjectChange={handleChange}
        />
      ) : null}
      {content}
      {isItemSelected && (
        <>
          <DimensionArrows size={item.size} position={item.position} rotationY={item.rotationY} hideY={planView} hideZ={frontView} />
          <Html position={[item.position[0], tagY, item.position[2]]} center className="item-tag-html">
            <div className={`item-tag ${item.attached ? 'attached' : 'fixed'}`}>
              {item.attached ? '📌 On surface' : '✣ Fixed'} · tilt {Math.round((item.rotationX * 180) / Math.PI)}°
            </div>
          </Html>
        </>
      )}
      {isInSelectedGroup && !isItemSelected && (
        <Html position={[item.position[0], tagY, item.position[2]]} center className="item-tag-html">
          <div className="item-tag group-member-tag">🔗 Grouped</div>
        </Html>
      )}
      {isMultiSelected && !isItemSelected && !isInSelectedGroup && (
        <Html position={[item.position[0], tagY, item.position[2]]} center className="item-tag-html">
          <div className="item-tag multi-select-tag">✓ Selected</div>
        </Html>
      )}
    </>
  )
}
