import { HTMLAttributes, ReactNode } from 'react'

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

export default function Container({ 
  children, 
  maxWidth = 'xl',
  className = '',
  ...props 
}: ContainerProps) {
  const maxWidths = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
  }

  return (
    <div
      className={`container mx-auto px-4 sm:px-6 lg:px-8 ${maxWidths[maxWidth]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

