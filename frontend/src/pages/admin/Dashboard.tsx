import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  People,
  PersonAdd,
  CheckCircle,
  TrendingUp,
} from '@mui/icons-material'
import { adminAPI, DashboardStats } from '../../services/adminAPI'
import StatsCard from '../../components/admin/StatsCard'

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
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">Please check:</Typography>
            <Typography variant="body2">1. You are logged in as an admin user</Typography>
            <Typography variant="body2">2. The backend API is running</Typography>
            <Typography variant="body2">3. Check browser console for more details</Typography>
          </Box>
        </Alert>
      </Container>
    )
  }

  if (!stats) {
    return (
      <Container maxWidth="xl">
        <Alert severity="warning" sx={{ mt: 2 }}>
          No statistics data available
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Overview of your system
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Total Users"
            value={stats.total_users}
            icon={<People />}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="Active Users"
            value={stats.active_users}
            icon={<CheckCircle />}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="New Today"
            value={stats.new_users_today}
            icon={<PersonAdd />}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard
            title="New This Week"
            value={stats.new_users_this_week}
            icon={<TrendingUp />}
            color="warning"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
          <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Users by Type
            </Typography>
            <Box sx={{ mt: 2, flexGrow: 1 }}>
              {Object.entries(stats.users_by_type).map(([type, count]) => (
                <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" textTransform="capitalize">
                    {type}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {count}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
          <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Users by Role
            </Typography>
            <Box sx={{ mt: 2, flexGrow: 1 }}>
              {Object.entries(stats.users_by_role).map(([role, count]) => (
                <Box key={role} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" textTransform="capitalize">
                    {role}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {count}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  )
}
