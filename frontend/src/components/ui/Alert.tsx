import { HTMLAttributes, ReactNode } from 'react'
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  severity?: 'error' | 'warning' | 'info' | 'success'
  onClose?: () => void
}

export default function Alert({ 
  children, 
  severity = 'info', 
  onClose,
  className = '',
  ...props 
}: AlertProps) {
  const variants = {
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    success: 'bg-green-50 border-green-200 text-green-700',
  }

  const icons = {
    error: XCircle,
    warning: AlertCircle,
    info: Info,
    success: CheckCircle,
  }

  const Icon = icons[severity]

  return (
    <div
      className={`p-4 border rounded-lg flex items-start gap-3 ${variants[severity]} ${className}`}
      {...props}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-current opacity-70 hover:opacity-100"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

