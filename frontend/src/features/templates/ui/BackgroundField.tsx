import { getErrorProps } from '../../../shared/ui/getErrorProps'
import { SegmentedControl } from '../../../shared/ui/SegmentedControl'
import { DEFAULT_COLOR, isHexColor, type FormValues } from '../lib/templateForm'

type BackgroundMode = 'color' | 'transparent'

type BackgroundFieldProps = {
  error?: string
  onChange: (patch: Partial<FormValues>) => void
  values: FormValues
}

export function BackgroundField({ error, onChange, values }: Readonly<BackgroundFieldProps>) {
  const swatch = isHexColor(values.backgroundColor) ? values.backgroundColor : DEFAULT_COLOR

  return (
    <div className="form-field">
      <span className="form-field__label">Фон плашки</span>
      <SegmentedControl<BackgroundMode>
        label="Фон плашки"
        name="background"
        onChange={(mode) => onChange({ transparent: mode === 'transparent' })}
        options={[
          { label: 'Цвет', value: 'color' },
          { label: 'Прозрачный', value: 'transparent' },
        ]}
        showRadio
        value={values.transparent ? 'transparent' : 'color'}
      />
      <div className="color-input">
        <input
          aria-label="Выбрать цвет"
          disabled={values.transparent}
          onChange={(event) => onChange({ backgroundColor: event.target.value.toUpperCase() })}
          type="color"
          value={swatch}
        />
        <input
          {...getErrorProps('background', error)}
          aria-label="Цвет фона в формате #RRGGBB"
          autoComplete="off"
          disabled={values.transparent}
          maxLength={7}
          name="background_color"
          onChange={(event) => onChange({ backgroundColor: event.target.value.toUpperCase() })}
          spellCheck={false}
          value={values.backgroundColor}
        />
      </div>
      {error ? (
        <span className="form-field__error" id="background-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}
