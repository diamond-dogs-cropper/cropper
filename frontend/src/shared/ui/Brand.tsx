type BrandProps = {
  label: string
  withMark?: boolean
}

export function Brand({ label, withMark = false }: Readonly<BrandProps>) {
  return (
    <span className="brand">
      {withMark ? <span className="brand__mark" aria-hidden="true" /> : null}
      <span>{label}</span>
    </span>
  )
}
