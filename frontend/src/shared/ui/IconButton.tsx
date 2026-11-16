import type { ComponentProps } from 'react'

type IconButtonProps = ComponentProps<'button'> & {
  label: string
  tone?: 'danger'
}

export function IconButton({ className = '', label, tone, type = 'button', ...props }: IconButtonProps) {
  const classes = ['icon-button', tone ? `icon-button--${tone}` : '', className].filter(Boolean).join(' ')

  return <button aria-label={label} className={classes} data-tooltip={label} type={type} {...props} />
}
