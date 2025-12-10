import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Typography,
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
} from '@mui/material'
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  Login as LoginIcon,
} from '@mui/icons-material'

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

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  // Show all links on all pages - anchor links will navigate to home with hash
  const displayLinks = navLinks

  return (
    <>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          <Typography
            variant="h5"
            component={RouterLink}
            to="/"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': { opacity: 0.8 },
            }}
          >
            KAMAFILE
          </Typography>

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
                  '&:hover': { borderColor: 'primary.dark', bgcolor: 'primary.light' },
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
          </Box>

          {/* Mobile Menu Button */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
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
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
            KAMAFILE
          </Typography>
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
        </List>
      </Drawer>
    </>
  )
}
