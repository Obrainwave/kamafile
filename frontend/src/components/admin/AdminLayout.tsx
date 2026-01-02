import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  FileText,
  Bot,
  Settings,
  LogOut,
  UserCircle,
  Menu,
  X,
} from 'lucide-react'
import { useAdmin } from '../../hooks/useAdmin'
import { authAPI } from '../../services/api'
import Spinner from '../ui/Spinner'
import Dropdown from '../ui/Dropdown'
import DropdownItem from '../ui/DropdownItem'

const menuItems = [
  { text: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { text: 'Users', icon: Users, path: '/admin/users' },
  { text: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
  { text: 'Content', icon: FileText, path: '/admin/content' },
  { text: 'RAG Management', icon: Bot, path: '/admin/rag' },
  { text: 'Settings', icon: Settings, path: '/admin/settings' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loading, isAdmin, user } = useAdmin()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await authAPI.logout()
      navigate('/signin')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAdmin) {
    return null // useAdmin hook will handle redirect
  }

  const getInitials = () => {
    return user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside 
        className="hidden md:block fixed left-0 top-0 h-full w-60 text-white z-30"
        style={{ backgroundColor: '#0f1419' }}
      >
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <h2 className="text-lg font-bold">Admin Panel</h2>
        </div>
        <nav className="py-4">
          {menuItems.map((item) => {
            const IconComponent = item.icon
            const isActive = location.pathname === item.path || 
                           (item.path !== '/admin' && location.pathname.startsWith(item.path))
            return (
              <button
                key={item.text}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left transition ${
                  isActive
                    ? 'text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
                style={isActive ? { backgroundColor: '#1a2332' } : {}}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <IconComponent className="w-5 h-5" />
                <span>{item.text}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setMobileOpen(false)}></div>
          <div 
            className="fixed left-0 top-0 h-full w-60 text-white"
            style={{ backgroundColor: '#0f1419' }}
          >
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
              <h2 className="text-lg font-bold">Admin Panel</h2>
              <button onClick={() => setMobileOpen(false)} className="text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="py-4">
              {menuItems.map((item) => {
                const IconComponent = item.icon
                const isActive = location.pathname === item.path || 
                               (item.path !== '/admin' && location.pathname.startsWith(item.path))
                return (
                  <button
                    key={item.text}
                    onClick={() => {
                      navigate(item.path)
                      setMobileOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-6 py-3 text-left transition ${
                      isActive
                        ? 'text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                    style={isActive ? { backgroundColor: '#1a2332' } : {}}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span>{item.text}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 md:ml-60">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="h-16 flex items-center justify-between px-4 md:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-sm text-gray-600">
                {user?.full_name || user?.email}
              </span>
              <Dropdown
                trigger={
                  <div 
                    className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-medium cursor-pointer hover:opacity-80 transition"
                    style={{ backgroundColor: '#4caf50' }}
                  >
                    {getInitials()}
                  </div>
                }
              >
                <DropdownItem to="/" onClick={() => {}}>
                  <div className="flex items-center gap-3">
                    <UserCircle className="w-4 h-4" />
                    Go to Site
                  </div>
                </DropdownItem>
                <div className="border-t border-gray-200 my-1"></div>
                <DropdownItem onClick={handleLogout}>
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </div>
                </DropdownItem>
              </Dropdown>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
