type SegmentedControlProps<T extends string> = {
  label: string
  name: string
  onChange: (value: T) => void
  options: Array<{ label: string; value: T }>
  showRadio?: boolean
  value: T
}

export function SegmentedControl<T extends string>({
  label,
  name,
  onChange,
  options,
  showRadio = false,
  value,
}: Readonly<SegmentedControlProps<T>>) {
  const className = showRadio ? 'segmented segmented--radio' : 'segmented'

  return (
    <div aria-label={label} className={className} role="radiogroup">
      {options.map((option) => (
        <label className="segmented__option" key={option.value}>
          <input
            checked={option.value === value}
            name={name}
            onChange={() => onChange(option.value)}
            type="radio"
            value={option.value}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}
