// Unit helpers. State is metres; UI is centimetres.

export const M_TO_CM = 100
export const CM_TO_M = 0.01

export const mToCm = (m: number): number => m * M_TO_CM
export const cmToM = (cm: number): number => cm * CM_TO_M

/** Format a metre value as a centimetre string, e.g. 0.42 -> "42.0 cm". */
export const formatCm = (m: number): string => `${(m * M_TO_CM).toFixed(1)} cm`

/** Round a metre value to the nearest `stepCm` centimetres. */
export const snapCm = (m: number, stepCm = 0.5): number => {
  const cm = m * M_TO_CM
  return (Math.round(cm / stepCm) * stepCm) * CM_TO_M
}

/** Snap an XZ coordinate to a metric grid (default 1 cm). */
export const snapGrid = (m: number, stepCm = 1): number => snapCm(m, stepCm)

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v))
