import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
}

export default function Card({ children, hover = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm transition w-full ${
        hover ? 'hover:shadow-md hover:-translate-y-1' : ''
      } ${className}`}
      style={{ maxWidth: '100%', boxSizing: 'border-box' }}
      {...props}
    >
      {children}
    </div>
  )
}

