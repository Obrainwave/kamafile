import { ReactNode } from 'react'
import Card from '../ui/Card'

interface StatsCardProps {
  title: string
  value: number | string
  icon: ReactNode
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'
}

const colorClasses = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  success: 'text-green-600',
  error: 'text-red-600',
  info: 'text-blue-600',
  warning: 'text-yellow-600',
}

export default function StatsCard({ title, value, icon, color = 'primary' }: StatsCardProps) {
  return (
    <Card hover className="p-6 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <h6 className="text-gray-600 font-medium">{title}</h6>
        <div className={colorClasses[color]}>
          {icon}
        </div>
      </div>
      <div className={`text-4xl font-bold ${colorClasses[color]}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </Card>
  )
}
