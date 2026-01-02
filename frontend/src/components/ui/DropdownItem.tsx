import { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface DropdownItemProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  to?: string
  onClick?: () => void
  disabled?: boolean
}

export default function DropdownItem({ children, to, onClick, disabled = false, className = '', ...props }: DropdownItemProps) {
  const baseClasses = 'block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition'
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'

  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className={`${baseClasses} ${disabledClasses} ${className}`}
        {...(props as any)}
      >
        {children}
      </Link>
    )
  }

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`${baseClasses} ${disabledClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

