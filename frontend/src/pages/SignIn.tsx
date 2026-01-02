import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock } from 'lucide-react'
import Header from '../components/Header'
import { authAPI } from '../services/api'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import Alert from '../components/ui/Alert'
import Spinner from '../components/ui/Spinner'
import Container from '../components/ui/Container'

export default function SignIn() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password,
      })

      // Store token and user data
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('user', JSON.stringify(response.user))

      // Dispatch custom event to notify Header of authentication change
      window.dispatchEvent(new CustomEvent('auth-change'))

      // Navigate to home or dashboard
      navigate('/')
    } catch (err: any) {
      // Handle validation errors from Pydantic
      let errorMessage = 'An error occurred. Please try again.'
      
      if (err.response?.data) {
        const data = err.response.data
        
        // Handle Pydantic validation errors (array format)
        if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map((item: any) => item.msg).join(', ')
        }
        // Handle string error messages
        else if (typeof data.detail === 'string') {
          errorMessage = data.detail
        }
        // Handle object error messages
        else if (data.detail && typeof data.detail === 'object') {
          errorMessage = data.detail.msg || data.detail.message || JSON.stringify(data.detail)
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 flex items-center py-16">
        <Container maxWidth="sm">
          <Card className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-2">Sign In</h1>
              <p className="text-gray-600">Welcome back to Kamafile</p>
            </div>

            {error && (
              <div className="mb-6">
                <Alert severity="error">{error}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                autoFocus
              />

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                disabled={loading}
              >
                {loading ? <Spinner size="sm" className="mx-auto" /> : 'Sign In'}
              </Button>

              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link
                    to="/signup"
                    className="font-semibold text-primary hover:underline"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          </Card>
        </Container>
      </div>
    </div>
  )
}
