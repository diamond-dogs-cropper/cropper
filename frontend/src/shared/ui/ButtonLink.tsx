import type { ComponentProps } from 'react'
import { Link } from 'react-router-dom'

type ButtonLinkProps = ComponentProps<typeof Link> & {
  size?: 'default' | 'large'
}

export function ButtonLink({ className = '', size = 'default', ...props }: ButtonLinkProps) {
  const classes = ['button-link', size === 'large' ? 'button-link--large' : '', className]
    .filter(Boolean)
    .join(' ')

  return <Link className={classes} {...props} />
}
