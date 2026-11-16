import { SearchIcon } from './icons'

interface SearchFieldProps {
  label: string
  onChange: (value: string) => void
  value: string
}

export function SearchField({ label, onChange, value }: Readonly<SearchFieldProps>) {
  return (
    <label className="search-field">
      <SearchIcon />
      <input
        aria-label={label}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && onChange('')}
        placeholder={label}
        type="search"
        value={value}
      />
    </label>
  )
}
