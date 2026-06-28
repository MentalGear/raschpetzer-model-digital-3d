import { mToCm, cmToM } from '../state/units'

interface NumberFieldProps {
  label: string
  /** value in metres */
  value: number
  /** called with metres */
  onChange: (metres: number) => void
  min?: number
  max?: number
  step?: number
}

/** A labelled centimetre input bound to a metre-valued field. */
export function NumberField({ label, value, onChange, min = 1, max = 500, step = 0.5 }: NumberFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="field-input">
        <input
          type="number"
          value={Number(mToCm(value).toFixed(1))}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const cm = parseFloat(e.target.value)
            if (!Number.isNaN(cm)) onChange(cmToM(cm))
          }}
        />
        <span className="unit">cm</span>
      </div>
    </label>
  )
}
