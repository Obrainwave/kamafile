import { useState, useEffect } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Menu, X, UserPlus, LogIn, LogOut, UserCircle, LayoutDashboard } from 'lucide-react'
import hBlackLogo from '../assets/images/h-black-logo.jpeg'
import { User } from '../services/api'
import Button from './ui/Button'
import Dropdown from './ui/Dropdown'
import DropdownItem from './ui/DropdownItem'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: '#contact' },
]

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Check authentication status
    const token = localStorage.getItem('access_token')
    const userData = localStorage.getItem('user')
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setIsAuthenticated(true)
        setUser(parsedUser)
      } catch (error) {
        // Invalid user data, clear it
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        setIsAuthenticated(false)
        setUser(null)
      }
    } else {
      setIsAuthenticated(false)
      setUser(null)
    }

    // Listen for storage changes (e.g., login/logout in another tab)
    const handleStorageChange = () => {
      const newToken = localStorage.getItem('access_token')
      const newUserData = localStorage.getItem('user')
      
      if (newToken && newUserData) {
        try {
          const parsedUser = JSON.parse(newUserData)
          setIsAuthenticated(true)
          setUser(parsedUser)
        } catch {
          setIsAuthenticated(false)
          setUser(null)
        }
      } else {
        setIsAuthenticated(false)
        setUser(null)
      }
    }

    // Listen for custom auth-change event (same tab login/logout)
    const handleAuthChange = () => {
      handleStorageChange()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('auth-change', handleAuthChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-change', handleAuthChange)
    }
  }, [])

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
    setUser(null)
    navigate('/')
    // Trigger a custom event to notify other components
    window.dispatchEvent(new Event('storage'))
  }

  // Show all links on all pages - anchor links will navigate to home with hash
  const displayLinks = navLinks

  const getInitials = (user: User) => {
    return user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'
  }

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator' || user.role === 'support')

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <RouterLink
              to="/"
              className="flex items-center hover:opacity-80 transition"
            >
              <img
                src={hBlackLogo}
                alt="Kamafile Logo"
                className="h-12 md:h-14 w-auto object-contain"
              />
            </RouterLink>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {displayLinks.map((link) => {
                const isRoute = link.href.startsWith('/')
                const isAnchor = link.href.startsWith('#')
                const to = isAnchor ? `/${link.href}` : (isRoute ? link.href : undefined)
                
                if (isRoute || isAnchor) {
                  return (
                    <RouterLink
                      key={link.label}
                      to={to as string}
                      className="text-gray-900 font-medium text-sm hover:text-primary transition"
                    >
                      {link.label}
                    </RouterLink>
                  )
                } else {
                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      className="text-gray-900 font-medium text-sm hover:text-primary transition"
                    >
                      {link.label}
                    </a>
                  )
                }
              })}
              
              {isAuthenticated && user ? (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                  <Dropdown
                    trigger={
                      <div 
                        className="w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-medium cursor-pointer hover:opacity-80 transition"
                        style={{ backgroundColor: '#1a2332' }}
                      >
                        {getInitials(user)}
                      </div>
                    }
                  >
                    <DropdownItem disabled>
                      <div className="py-2">
                        <p className="font-semibold text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </DropdownItem>
                    <div className="border-t border-gray-200 my-1"></div>
                    {isAdmin && (
                      <DropdownItem to="/admin">
                        <div className="flex items-center gap-3">
                          <LayoutDashboard className="w-4 h-4" />
                          Admin Dashboard
                        </div>
                      </DropdownItem>
                    )}
                    <DropdownItem to="/profile">
                      <div className="flex items-center gap-3">
                        <UserCircle className="w-4 h-4" />
                        Profile
                      </div>
                    </DropdownItem>
                  </Dropdown>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <RouterLink
                    to="/signin"
                    className="px-4 py-2 text-sm font-medium rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all inline-flex items-center justify-center"
                    style={{
                      borderColor: '#1a2332',
                      color: '#1a2332',
                      backgroundColor: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#1a2332'
                      e.currentTarget.style.color = '#ffffff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#1a2332'
                    }}
                  >
                    Sign In
                  </RouterLink>
                  <RouterLink
                    to="/signup"
                    className="px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all inline-flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: '#4caf50',
                      color: '#ffffff',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#388e3c'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#4caf50'
                    }}
                  >
                    <UserPlus className="w-4 h-4" />
                    Sign Up
                  </RouterLink>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-1"
                  >
                    <LogOut className="w-3 h-3" />
                  </Button>
                  <Dropdown
                    trigger={
                      <div 
                        className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-medium cursor-pointer hover:opacity-80 transition"
                        style={{ backgroundColor: '#1a2332' }}
                      >
                        {getInitials(user)}
                      </div>
                    }
                  >
                    <DropdownItem disabled>
                      <div className="py-2">
                        <p className="font-semibold text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </DropdownItem>
                    <div className="border-t border-gray-200 my-1"></div>
                    {isAdmin && (
                      <DropdownItem to="/admin">
                        <div className="flex items-center gap-3">
                          <LayoutDashboard className="w-4 h-4" />
                          Admin Dashboard
                        </div>
                      </DropdownItem>
                    )}
                    <DropdownItem to="/profile">
                      <div className="flex items-center gap-3">
                        <UserCircle className="w-4 h-4" />
                        Profile
                      </div>
                    </DropdownItem>
                  </Dropdown>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <RouterLink
                    to="/signin"
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all inline-flex items-center justify-center whitespace-nowrap"
                    style={{
                      borderColor: '#1a2332',
                      color: '#1a2332',
                      backgroundColor: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#1a2332'
                      e.currentTarget.style.color = '#ffffff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#1a2332'
                    }}
                  >
                    Sign In
                  </RouterLink>
                  <RouterLink
                    to="/signup"
                    className="px-3 py-1.5 text-xs font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all inline-flex items-center justify-center gap-1 whitespace-nowrap"
                    style={{
                      backgroundColor: '#4caf50',
                      color: '#ffffff',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#388e3c'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#4caf50'
                    }}
                  >
                    <UserPlus className="w-3 h-3" />
                    Sign Up
                  </RouterLink>
                </div>
              )}
              <button
                onClick={handleDrawerToggle}
                className="p-2 text-gray-700 hover:text-primary transition"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleDrawerToggle}></div>
          <div className="fixed right-0 top-0 h-full w-72 bg-white shadow-xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <img
                src={hBlackLogo}
                alt="Kamafile Logo"
                className="h-12 w-auto object-contain"
              />
              <button
                onClick={handleDrawerToggle}
                className="p-2 text-gray-700 hover:text-primary transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto h-full pb-4">
              <nav className="py-4">
                {displayLinks.map((link) => {
                  const isRoute = link.href.startsWith('/')
                  const isAnchor = link.href.startsWith('#')
                  const to = isAnchor ? `/${link.href}` : (isRoute ? link.href : undefined)
                  
                  return (
                    <RouterLink
                      key={link.label}
                      to={to as string}
                      onClick={handleDrawerToggle}
                      className="block px-4 py-3 text-gray-900 hover:bg-primary-light hover:text-primary transition"
                    >
                      {link.label}
                    </RouterLink>
                  )
                })}
                
                {isAuthenticated && user ? (
                  <div className="mt-4 px-4 space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2">
                      <div 
                        className="w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-medium"
                        style={{ backgroundColor: '#1a2332' }}
                      >
                        {getInitials(user)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-900">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        component={RouterLink}
                        to="/admin"
                        onClick={handleDrawerToggle}
                        variant="primary"
                        fullWidth
                        className="flex items-center justify-center gap-2 mb-2"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Admin Dashboard
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        handleLogout()
                        handleDrawerToggle()
                      }}
                      variant="outline"
                      fullWidth
                      className="flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 px-4 space-y-2">
                    <Button
                      component={RouterLink}
                      to="/signin"
                      variant="outline"
                      fullWidth
                      onClick={handleDrawerToggle}
                      className="flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </Button>
                    <Button
                      component={RouterLink}
                      to="/signup"
                      variant="secondary"
                      fullWidth
                      onClick={handleDrawerToggle}
                      className="flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Sign Up
                    </Button>
                  </div>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
