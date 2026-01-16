import { HTMLAttributes, ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full'
  hideBackdrop?: boolean
}

export default function Modal({ 
  open, 
  onClose, 
  title, 
  children, 
  size = 'md',
  className = '',
  hideBackdrop = false,
  ...props 
}: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  if (!open) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    '3xl': 'max-w-6xl',
    '4xl': 'max-w-7xl',
    'full': 'max-w-full mx-4',
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 transition-opacity ${hideBackdrop ? 'bg-transparent' : 'bg-black bg-opacity-50'}`}
        onClick={onClose}
        style={{ zIndex: 1 }}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div 
        className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0"
        onClick={onClose}
      >
        <div
          className={`relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizes[size]} w-full ${className}`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ zIndex: 2, margin: '0 auto', position: 'relative' }}
          role="dialog"
          aria-modal="true"
          {...props}
        >
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          <div className="px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

