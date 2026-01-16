import { ButtonHTMLAttributes, ReactNode, ElementType } from 'react'
import { Link } from 'react-router-dom'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'component'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  fullWidth?: boolean
  component?: ElementType
  to?: string
}

export default function Button({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  fullWidth = false,
  component,
  to,
  ...props 
}: ButtonProps) {
  const baseClasses = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center'
  
  // Color definitions - using actual hex values
  const colors = {
    primary: {
      bg: '#1a2332',
      hover: '#0f1419',
      text: '#ffffff',
    },
    secondary: {
      bg: '#4caf50',
      hover: '#388e3c',
      text: '#ffffff',
    },
    danger: {
      bg: '#dc2626', // red-600
      hover: '#b91c1c', // red-700
      text: '#ffffff',
    },
  }
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }
  
  // Get inline styles based on variant
  const getStyle = (): React.CSSProperties => {
    if (variant === 'primary') {
      return {
        backgroundColor: colors.primary.bg,
        color: colors.primary.text,
      }
    }
    if (variant === 'secondary') {
      return {
        backgroundColor: colors.secondary.bg,
        color: colors.secondary.text,
      }
    }
    if (variant === 'danger') {
      return {
        backgroundColor: colors.danger.bg,
        color: colors.danger.text,
      }
    }
    if (variant === 'outline') {
      return {
        borderColor: colors.primary.bg,
        color: colors.primary.bg,
        backgroundColor: 'transparent',
        borderWidth: '2px',
        borderStyle: 'solid',
      }
    }
    if (variant === 'ghost') {
      return {
        color: colors.primary.bg,
        backgroundColor: 'transparent',
      }
    }
    return {}
  }
  
  const getHoverStyle = (): React.CSSProperties => {
    if (variant === 'primary') {
      return { backgroundColor: colors.primary.hover }
    }
    if (variant === 'secondary') {
      return { backgroundColor: colors.secondary.hover }
    }
    if (variant === 'danger') {
      return { backgroundColor: colors.danger.hover }
    }
    if (variant === 'outline') {
      return {
        backgroundColor: colors.primary.bg,
        color: colors.primary.text,
      }
    }
    if (variant === 'ghost') {
      return { backgroundColor: '#f3f4f6' }
    }
    return {}
  }
  
  const classes = `${baseClasses} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`
  const style = getStyle()
  const hoverStyle = getHoverStyle()
  
  // Combine styles for hover effect
  const combinedStyle: React.CSSProperties & { '--hover-bg'?: string; '--hover-color'?: string } = {
    ...style,
    '--hover-bg': hoverStyle.backgroundColor as string,
    '--hover-color': hoverStyle.color as string,
  }
  
  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement
    if (hoverStyle.backgroundColor) {
      target.style.backgroundColor = hoverStyle.backgroundColor as string
    }
    if (hoverStyle.color) {
      target.style.color = hoverStyle.color as string
    }
  }
  
  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement
    if (style.backgroundColor) {
      target.style.backgroundColor = style.backgroundColor as string
    }
    if (style.color) {
      target.style.color = style.color as string
    }
  }
  
  if (component) {
    const LinkComponent = component
    return (
      <LinkComponent
        to={to}
        className={classes}
        style={combinedStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...(props as any)}
      >
        {children}
      </LinkComponent>
    )
  }
  
  if (to) {
    return (
      <Link
        to={to}
        className={classes}
        style={combinedStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...(props as any)}
      >
        {children}
      </Link>
    )
  }
  
  return (
    <button
      className={classes}
      style={combinedStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  )
}
