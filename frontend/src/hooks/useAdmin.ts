import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI, User } from '../services/api'

export function useAdmin() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const currentUser = await authAPI.getCurrentUser()
      setUser(currentUser)
      
      // Check if user has admin role
      const adminRoles = ['admin', 'super_admin', 'moderator', 'support']
      if (currentUser.role && adminRoles.includes(currentUser.role)) {
        setIsAdmin(true)
      } else {
        // Redirect non-admin users
        navigate('/')
      }
    } catch (error) {
      // Not authenticated, redirect to sign in
      navigate('/signin')
    } finally {
      setLoading(false)
    }
  }

  return { user, loading, isAdmin }
}
