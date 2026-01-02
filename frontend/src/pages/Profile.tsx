import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Phone, Calendar, UserCircle } from 'lucide-react'
import Header from '../components/Header'
import { User, authAPI } from '../services/api'
import Container from '../components/ui/Container'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

export default function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          navigate('/signin')
          return
        }

        const userData = await authAPI.getCurrentUser()
        setUser(userData)
      } catch (error) {
        console.error('Failed to load user:', error)
        navigate('/signin')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [navigate])

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex justify-center items-center min-h-[50vh]">
          <Spinner size="lg" />
        </div>
      </>
    )
  }

  if (!user) {
    return null
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  const getInitials = () => {
    return user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'
  }

  return (
    <>
      <Header />
      <Container maxWidth="md" className="py-8">
        <h1 className="text-4xl font-bold mb-2">Profile</h1>
        <p className="text-gray-600 mb-8">
          View and manage your account information
        </p>

        <Card className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-30 h-30 rounded-full bg-primary text-white flex items-center justify-center text-5xl font-medium mb-4">
              {getInitials()}
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {user.full_name}
            </h2>
            <p className="text-gray-600">
              {user.user_type}
            </p>
          </div>

          <div className="border-t border-gray-200 my-6"></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <Mail className="w-6 h-6 text-primary" />
              <div>
                <p className="text-xs text-gray-600 mb-1">
                  Email
                </p>
                <p className="font-medium">
                  {user.email}
                </p>
              </div>
            </div>

            {user.phone_number && (
              <div className="flex items-center gap-4">
                <Phone className="w-6 h-6 text-primary" />
                <div>
                  <p className="text-xs text-gray-600 mb-1">
                    Phone Number
                  </p>
                  <p className="font-medium">
                    {user.phone_number}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Calendar className="w-6 h-6 text-primary" />
              <div>
                <p className="text-xs text-gray-600 mb-1">
                  Member Since
                </p>
                <p className="font-medium">
                  {formatDate(user.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <UserCircle className="w-6 h-6 text-primary" />
              <div>
                <p className="text-xs text-gray-600 mb-1">
                  Account Status
                </p>
                <p className="font-medium">
                  {user.is_active ? 'Active' : 'Inactive'}
                  {user.is_verified && ' • Verified'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-4 justify-end">
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to Home
            </Button>
            <Button variant="primary" disabled>
              Edit Profile
            </Button>
          </div>
        </Card>
      </Container>
    </>
  )
}
