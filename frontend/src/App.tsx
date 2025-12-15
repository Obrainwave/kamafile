import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { CssBaseline, ThemeProvider, CircularProgress, Box } from '@mui/material'
import { theme } from './theme'

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage'))
const SignIn = lazy(() => import('./pages/SignIn'))
const SignUp = lazy(() => import('./pages/SignUp'))
const About = lazy(() => import('./pages/About'))
const ChatBot = lazy(() => import('./components/ChatBot'))

// Loading component
const PageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
    }}
  >
    <CircularProgress />
  </Box>
)

// Lazy load ChatBot only after initial page load
function LazyChatBot() {
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    // Load ChatBot after a delay to prioritize main content
    const timer = setTimeout(() => {
      setShouldLoad(true)
    }, 2000) // Load after 2 seconds

    return () => clearTimeout(timer)
  }, [])

  if (!shouldLoad) return null

  return (
    <Suspense fallback={null}>
      <ChatBot />
    </Suspense>
  )
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/about" element={<About />} />
          </Routes>
          <LazyChatBot />
        </Suspense>
      </Router>
    </ThemeProvider>
  )
}

export default App
