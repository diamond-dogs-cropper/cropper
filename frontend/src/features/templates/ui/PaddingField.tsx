import { FormField } from '../../../shared/ui/FormField'
import { getErrorProps } from '../../../shared/ui/getErrorProps'
import { SegmentedControl } from '../../../shared/ui/SegmentedControl'
import type { Padding } from '../model/templates.types'
import type { FormValues, PaddingMode } from '../lib/templateForm'

const sides: Array<{ key: keyof Padding; label: string }> = [
  { key: 'top', label: 'Сверху, px' },
  { key: 'right', label: 'Справа, px' },
  { key: 'bottom', label: 'Снизу, px' },
  { key: 'left', label: 'Слева, px' },
]

type PaddingFieldProps = {
  error?: string
  onChange: (patch: Partial<FormValues>) => void
  values: FormValues
}

export function PaddingField({ error, onChange, values }: Readonly<PaddingFieldProps>) {
  function changeMode(paddingMode: PaddingMode) {
    if (paddingMode === 'all') {
      onChange({ paddingMode })
      return
    }

    const all = values.paddingAll
    onChange({ padding: { bottom: all, left: all, right: all, top: all }, paddingMode })
  }

  return (
    <div className="form-section">
      <h3>Охранные отступы</h3>
      <SegmentedControl<PaddingMode>
        label="Режим отступов"
        name="padding-mode"
        onChange={changeMode}
        options={[
          { label: 'Общие', value: 'all' },
          { label: 'По сторонам', value: 'sides' },
        ]}
        value={values.paddingMode}
      />
      {values.paddingMode === 'all' ? (
        <FormField
          error={error}
          hint="Логотип останется внутри безопасной области."
          htmlFor="padding-all"
          label="Со всех сторон, px"
        >
          <input
            {...getErrorProps('padding-all', error)}
            autoComplete="off"
            id="padding-all"
            inputMode="numeric"
            name="padding_all"
            onChange={(event) => onChange({ paddingAll: event.target.value })}
            value={values.paddingAll}
          />
        </FormField>
      ) : (
        <>
          <div className="form-grid">
            {sides.map((side) => (
              <FormField htmlFor={`padding-${side.key}`} key={side.key} label={side.label}>
                <input
                  {...getErrorProps('padding', error)}
                  autoComplete="off"
                  id={`padding-${side.key}`}
                  inputMode="numeric"
                  name={`padding_${side.key}`}
                  onChange={(event) =>
                    onChange({ padding: { ...values.padding, [side.key]: event.target.value } })
                  }
                  value={values.padding[side.key]}
                />
              </FormField>
            ))}
          </div>
          {error ? (
            <span className="form-field__error" id="padding-error" role="alert">
              {error}
            </span>
          ) : (
            <span className="form-field__hint">Логотип останется внутри безопасной области.</span>
          )}
        </>
      )}
    </div>
  )
}
