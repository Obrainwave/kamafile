import { useState, useEffect } from 'react'
import {
  Users,
  UserPlus,
  CheckCircle,
  TrendingUp,
} from 'lucide-react'
import { adminAPI, DashboardStats } from '../../services/adminAPI'
import StatsCard from '../../components/admin/StatsCard'
import Container from '../../components/ui/Container'
import Card from '../../components/ui/Card'
import Alert from '../../components/ui/Alert'
import Spinner from '../../components/ui/Spinner'

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Loading dashboard stats...')
      const data = await adminAPI.getDashboardStats()
      console.log('Dashboard stats loaded:', data)
      setStats(data)
    } catch (err: any) {
      console.error('Dashboard stats error:', err)
      console.error('Error response:', err.response)
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load dashboard stats'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Container maxWidth="xl">
        <div className="flex justify-center items-center min-h-[50vh]">
          <Spinner size="lg" />
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Alert severity="error" className="mt-4">
          {error}
          <div className="mt-4 space-y-1">
            <p className="text-sm">Please check:</p>
            <p className="text-sm">1. You are logged in as an admin user</p>
            <p className="text-sm">2. The backend API is running</p>
            <p className="text-sm">3. Check browser console for more details</p>
          </div>
        </Alert>
      </Container>
    )
  }

  if (!stats) {
    return (
      <Container maxWidth="xl">
        <Alert severity="warning" className="mt-4">
          No statistics data available
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg">
      <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">
        Overview of your system
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <StatsCard
          title="Total Users"
          value={stats.total_users}
          icon={<Users className="w-6 h-6" />}
          color="primary"
        />
        <StatsCard
          title="Active Users"
          value={stats.active_users}
          icon={<CheckCircle className="w-6 h-6" />}
          color="success"
        />
        <StatsCard
          title="New Today"
          value={stats.new_users_today}
          icon={<UserPlus className="w-6 h-6" />}
          color="info"
        />
        <StatsCard
          title="New This Week"
          value={stats.new_users_this_week}
          icon={<TrendingUp className="w-6 h-6" />}
          color="warning"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 flex flex-col h-full">
          <h3 className="text-xl font-semibold mb-4">
            Users by Type
          </h3>
          <div className="mt-4 flex-grow space-y-2">
            {Object.entries(stats.users_by_type).map(([type, count]) => (
              <div key={type} className="flex justify-between">
                <p className="text-sm capitalize text-gray-600">
                  {type}
                </p>
                <p className="text-sm font-bold">
                  {count}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 flex flex-col h-full">
          <h3 className="text-xl font-semibold mb-4">
            Users by Role
          </h3>
          <div className="mt-4 flex-grow space-y-2">
            {Object.entries(stats.users_by_role).map(([role, count]) => (
              <div key={role} className="flex justify-between">
                <p className="text-sm capitalize text-gray-600">
                  {role}
                </p>
                <p className="text-sm font-bold">
                  {count}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Container>
  )
}
