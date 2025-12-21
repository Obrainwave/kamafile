import { useState, useEffect } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  Stack,
  IconButton,
  Link,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Avatar,
  Typography,
  Divider,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  Login as LoginIcon,
  AccountCircle,
  Logout,
  Dashboard as DashboardIcon,
} from '@mui/icons-material'
import hBlackLogo from '../assets/images/h-black-logo.jpeg'
import { User } from '../services/api'

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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
    setUser(null)
    handleMenuClose()
    navigate('/')
    // Trigger a custom event to notify other components
    window.dispatchEvent(new Event('storage'))
  }

  // Show all links on all pages - anchor links will navigate to home with hash
  const displayLinks = navLinks

  return (
    <>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              '&:hover': { opacity: 0.8 },
            }}
          >
            <Box
              component="img"
              src={hBlackLogo}
              alt="Kamafile Logo"
              sx={{
                height: { xs: 48, md: 56 },
                width: 'auto',
                objectFit: 'contain',
              }}
            />
          </Box>

          {/* Desktop Navigation */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 3,
            }}
          >
            {displayLinks.map((link) => {
              const isRoute = link.href.startsWith('/')
              const isAnchor = link.href.startsWith('#')
              // For anchor links, navigate to home page with hash
              const href = isAnchor ? `/${link.href}` : (isRoute ? undefined : link.href)
              const to = isAnchor ? `/${link.href}` : (isRoute ? link.href : undefined)
              
              if (isRoute || isAnchor) {
                return (
                  <Link
                    key={link.label}
                    component={RouterLink}
                    to={to as string}
                    color="text.primary"
                    underline="hover"
                    sx={{
                      fontWeight: 500,
                      fontSize: '0.95rem',
                      '&:hover': { color: 'primary.main' },
                      transition: 'color 0.2s',
                      textDecoration: 'none',
                    }}
                  >
                    {link.label}
                  </Link>
                )
              } else {
                return (
                  <Link
                    key={link.label}
                    href={href}
                    color="text.primary"
                    underline="hover"
                    sx={{
                      fontWeight: 500,
                      fontSize: '0.95rem',
                      '&:hover': { color: 'primary.main' },
                      transition: 'color 0.2s',
                      textDecoration: 'none',
                    }}
                  >
                    {link.label}
                  </Link>
                )
              }
            })}
            {isAuthenticated && user ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  onClick={handleLogout}
                  variant="outlined"
                  size="small"
                  startIcon={<Logout />}
                  sx={{
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    px: 2,
                    py: 0.75,
                    '&:hover': { borderColor: 'primary.dark', bgcolor: 'primary.light', color: 'white' },
                  }}
                >
                  Logout
                </Button>
                <IconButton
                  onClick={handleMenuOpen}
                  sx={{
                    p: 0,
                    '&:hover': { opacity: 0.8 },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: 'primary.main',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <MenuItem disabled>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {user.full_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </MenuItem>
                  <Divider />
                  {(user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator' || user.role === 'support') && (
                    <MenuItem component={RouterLink} to="/admin" onClick={handleMenuClose}>
                      <DashboardIcon sx={{ mr: 1.5 }} />
                      Admin Dashboard
                    </MenuItem>
                  )}
                  <MenuItem component={RouterLink} to="/profile" onClick={handleMenuClose}>
                    <AccountCircle sx={{ mr: 1.5 }} />
                    Profile
                  </MenuItem>
                </Menu>
              </Box>
            ) : (
              <Stack direction="row" spacing={1}>
                <Button
                  component={RouterLink}
                  to="/signin"
                  variant="outlined"
                  size="small"
                  sx={{
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    px: 2,
                    py: 0.75,
                    '&:hover': { borderColor: 'primary.dark', bgcolor: 'primary.light', color: 'white' },
                  }}
                >
                  Sign In
                </Button>
                <Button
                  component={RouterLink}
                  to="/signup"
                  variant="contained"
                  size="small"
                  startIcon={<PersonAddIcon />}
                  sx={{
                    bgcolor: 'secondary.main',
                    px: 2,
                    py: 0.75,
                    '&:hover': { bgcolor: 'secondary.dark' },
                  }}
                >
                  Sign Up
                </Button>
              </Stack>
            )}
          </Box>

          {/* Mobile Menu Button */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
            {isAuthenticated && user ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  onClick={handleLogout}
                  variant="outlined"
                  size="small"
                  startIcon={<Logout />}
                  sx={{
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    px: 1.5,
                    py: 0.5,
                    fontSize: '0.875rem',
                    '&:hover': { borderColor: 'primary.dark' },
                  }}
                >
                  Logout
                </Button>
                <IconButton
                  onClick={handleMenuOpen}
                  sx={{
                    p: 0,
                    '&:hover': { opacity: 0.8 },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: 'primary.main',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <MenuItem disabled>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {user.full_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </MenuItem>
                  <Divider />
                  {(user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator' || user.role === 'support') && (
                    <MenuItem component={RouterLink} to="/admin" onClick={handleMenuClose}>
                      <DashboardIcon sx={{ mr: 1.5 }} />
                      Admin Dashboard
                    </MenuItem>
                  )}
                  <MenuItem component={RouterLink} to="/profile" onClick={handleMenuClose}>
                    <AccountCircle sx={{ mr: 1.5 }} />
                    Profile
                  </MenuItem>
                </Menu>
              </Box>
            ) : (
              <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', sm: 'flex' } }}>
                <Button
                  component={RouterLink}
                  to="/signin"
                  variant="outlined"
                  size="small"
                  sx={{
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    px: 1.5,
                    py: 0.5,
                    fontSize: '0.875rem',
                    '&:hover': { borderColor: 'primary.dark' },
                  }}
                >
                  Sign In
                </Button>
                <Button
                  component={RouterLink}
                  to="/signup"
                  variant="contained"
                  size="small"
                  sx={{
                    bgcolor: 'secondary.main',
                    px: 1.5,
                    py: 0.5,
                    fontSize: '0.875rem',
                    '&:hover': { bgcolor: 'secondary.dark' },
                  }}
                >
                  Sign Up
                </Button>
              </Stack>
            )}
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ ml: 1 }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            pt: 2,
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, mb: 2 }}>
          <Box
            component="img"
            src={hBlackLogo}
            alt="Kamafile Logo"
            sx={{
              height: 48,
              width: 'auto',
              objectFit: 'contain',
            }}
          />
          <IconButton onClick={handleDrawerToggle}>
            <CloseIcon />
          </IconButton>
        </Box>
        <List>
          {displayLinks.map((link) => {
            const isRoute = link.href.startsWith('/')
            const isAnchor = link.href.startsWith('#')
            // For anchor links, navigate to home page with hash
            const href = isAnchor ? `/${link.href}` : (isRoute ? undefined : link.href)
            const to = isAnchor ? `/${link.href}` : (isRoute ? link.href : undefined)
            
            return (
              <ListItem key={link.label} disablePadding>
                {isRoute || isAnchor ? (
                  <ListItemButton
                    component={RouterLink}
                    to={to as string}
                    onClick={handleDrawerToggle}
                    sx={{
                      '&:hover': {
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                      },
                    }}
                  >
                    <ListItemText primary={link.label} />
                  </ListItemButton>
                ) : (
                  <ListItemButton
                    href={href || '#'}
                    onClick={handleDrawerToggle}
                    sx={{
                      '&:hover': {
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                      },
                    }}
                  >
                    <ListItemText primary={link.label} />
                  </ListItemButton>
                )}
              </ListItem>
            )
          })}
          {isAuthenticated && user ? (
            <ListItem disablePadding sx={{ mt: 2, px: 2 }}>
              <Stack spacing={1} sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: 'primary.main',
                    }}
                  >
                    {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {user.full_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                </Box>
                {(user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator' || user.role === 'support') && (
                  <Button
                    component={RouterLink}
                    to="/admin"
                    onClick={handleDrawerToggle}
                    variant="contained"
                    fullWidth
                    startIcon={<DashboardIcon />}
                    sx={{
                      bgcolor: 'primary.main',
                      mb: 1,
                      '&:hover': { bgcolor: 'primary.dark' },
                    }}
                  >
                    Admin Dashboard
                  </Button>
                )}
                <Button
                  onClick={() => {
                    handleLogout()
                    handleDrawerToggle()
                  }}
                  variant="outlined"
                  fullWidth
                  startIcon={<Logout />}
                  sx={{
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    '&:hover': { borderColor: 'primary.dark', bgcolor: 'primary.light' },
                  }}
                >
                  Logout
                </Button>
              </Stack>
            </ListItem>
          ) : (
            <ListItem disablePadding sx={{ mt: 2, px: 2 }}>
              <Stack spacing={1} sx={{ width: '100%' }}>
                <Button
                  component={RouterLink}
                  to="/signin"
                  variant="outlined"
                  fullWidth
                  startIcon={<LoginIcon />}
                  onClick={handleDrawerToggle}
                  sx={{
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    '&:hover': { borderColor: 'primary.dark', bgcolor: 'primary.light' },
                  }}
                >
                  Sign In
                </Button>
                <Button
                  component={RouterLink}
                  to="/signup"
                  variant="contained"
                  fullWidth
                  startIcon={<PersonAddIcon />}
                  onClick={handleDrawerToggle}
                  sx={{
                    bgcolor: 'secondary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'secondary.dark' },
                  }}
                >
                  Sign Up
                </Button>
              </Stack>
            </ListItem>
          )}
        </List>
      </Drawer>
    </>
  )
}
