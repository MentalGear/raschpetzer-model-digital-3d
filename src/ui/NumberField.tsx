import { useState, useEffect } from 'react'
import { mToCm, cmToM } from '../state/units'

interface NumberFieldProps {
  label: string
  /** value in metres */
  value: number
  /** called with metres — fires only on blur or Enter, not on every keystroke */
  onChange: (metres: number) => void
  min?: number
  max?: number
  step?: number
}

/** A labelled centimetre input bound to a metre-valued field.
 *  Drafts locally; commits only on blur or Enter to avoid flooding undo history. */
export function NumberField({ label, value, onChange, min = 1, max = 500, step = 0.5 }: NumberFieldProps) {
  const [draft, setDraft] = useState(() => Number(mToCm(value).toFixed(1)).toString())
  const [focused, setFocused] = useState(false)

  // Sync draft from prop whenever value changes externally (e.g. scene gizmo drag).
  useEffect(() => {
    if (!focused) setDraft(Number(mToCm(value).toFixed(1)).toString())
  }, [value, focused])

  const commit = () => {
    const cm = parseFloat(draft)
    if (!Number.isNaN(cm)) onChange(cmToM(cm))
    else setDraft(Number(mToCm(value).toFixed(1)).toString())
    setFocused(false)
  }

  return (
    <label className="field">
      <span>{label}</span>
      <div className="field-input">
        <input
          type="number"
          aria-label={`${label} in centimetres`}
          value={draft}
          min={min}
          max={max}
          step={step}
          onFocus={() => setFocused(true)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
        />
        <span className="unit">cm</span>
      </div>
    </label>
  )
}
