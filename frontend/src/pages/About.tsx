import { Link as RouterLink } from 'react-router-dom'
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Link,
} from '@mui/material'
import {
  AccountBalance as TaxIcon,
  Security as SecurityIcon,
  People as PeopleIcon,
  Lightbulb as InnovationIcon,
  VerifiedUser as TrustIcon,
  Speed as SpeedIcon,
  Support as SupportIcon,
} from '@mui/icons-material'
import Header from '../components/Header'

export default function About() {
  const values = [
    {
      icon: <SecurityIcon />,
      title: 'Privacy First',
      description: 'Your tax documents and information are encrypted and secure. We never share your data without permission.',
    },
    {
      icon: <InnovationIcon />,
      title: 'Innovation',
      description: 'Leveraging AI and modern technology to simplify complex tax processes for Nigerians.',
    },
    {
      icon: <TrustIcon />,
      title: 'Trust & Compliance',
      description: 'NDPA-compliant and built with transparency. You control your data at all times.',
    },
    {
      icon: <SpeedIcon />,
      title: 'Efficiency',
      description: 'Get instant answers to tax questions and automated reminders for important deadlines.',
    },
    {
      icon: <SupportIcon />,
      title: 'Always Available',
      description: '24/7 access via WhatsApp and web platform. Get help when you need it, not just business hours.',
    },
    {
      icon: <PeopleIcon />,
      title: 'For Everyone',
      description: 'Designed for individuals, freelancers, micro-businesses, and SMEs across Nigeria.',
    },
  ]

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header />

      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
            <Typography
              variant="h1"
              component="h1"
              gutterBottom
              sx={{
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                fontWeight: 700,
                mb: 3,
              }}
            >
              About Kamafile
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 400,
                opacity: 0.95,
                lineHeight: 1.6,
                mb: 4,
              }}
            >
              Nigeria's Digital Tax Assistant
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: '1.1rem',
                opacity: 0.9,
                lineHeight: 1.8,
                maxWidth: 600,
                mx: 'auto',
              }}
            >
              We're on a mission to make tax compliance simple, accessible, and stress-free for every Nigerian.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Mission Section */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Box sx={{ maxWidth: 900, mx: 'auto', textAlign: 'center' }}>
            <Typography
              variant="h2"
              component="h2"
              gutterBottom
              sx={{ mb: 4, fontWeight: 600 }}
            >
              Our Mission
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: '1.125rem',
                lineHeight: 1.8,
                color: 'text.secondary',
                mb: 4,
              }}
            >
              Tax compliance in Nigeria is complex and overwhelming. With the 2026 tax reforms
              increasing complexity, millions of Nigerians struggle to understand their obligations,
              keep proper records, and meet deadlines.
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: '1.125rem',
                lineHeight: 1.8,
                color: 'text.secondary',
              }}
            >
              Kamafile exists to change that. We provide personalized tax guidance, secure document
              storage, and automated reminders—all accessible via WhatsApp and web. Our AI-powered
              assistant helps you understand your tax situation, categorize your income, and stay
              compliant without the stress.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* What We Do Section */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            component="h2"
            align="center"
            gutterBottom
            sx={{ mb: 8, fontWeight: 600 }}
          >
            What We Do
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 4,
            }}
          >
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 16px)' } }}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                    }}
                  >
                    <TaxIcon sx={{ fontSize: 32, color: 'white' }} />
                  </Box>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                    Personalized Tax Guidance
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    Get answers to your tax questions tailored to your specific situation. Our AI
                    assistant understands Nigerian tax laws and helps you navigate complexity.
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 16px)' } }}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      bgcolor: 'secondary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                    }}
                  >
                    <SecurityIcon sx={{ fontSize: 32, color: 'white' }} />
                  </Box>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                    Secure Document Vault
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    Store all your tax-related documents in one secure, encrypted location. Access
                    them anytime, anywhere, with PIN protection and end-to-end encryption.
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 16px)' } }}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                    }}
                  >
                    <SpeedIcon sx={{ fontSize: 32, color: 'white' }} />
                  </Box>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                    Automated Reminders
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    Never miss a tax deadline again. We send you timely reminders for filing
                    deadlines, payment dates, and important tax events.
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 16px)' } }}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      bgcolor: 'secondary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                    }}
                  >
                    <PeopleIcon sx={{ fontSize: 32, color: 'white' }} />
                  </Box>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                    Multi-Income Support
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    Whether you're an employee, freelancer, or business owner with multiple income
                    streams, we help you categorize and manage everything in one place.
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Values Section */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            component="h2"
            align="center"
            gutterBottom
            sx={{ mb: 8, fontWeight: 600 }}
          >
            Our Values
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 4,
            }}
          >
            {values.map((value, index) => (
              <Box key={index} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 16px)', md: '1 1 calc(33.33% - 22px)' } }}>
                <Card sx={{ height: '100%', textAlign: 'center' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box
                      sx={{
                        color: 'secondary.main',
                        mb: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        '& svg': { fontSize: 48 },
                      }}
                    >
                      {value.icon}
                    </Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                      {value.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {value.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: 'primary.main', color: 'white' }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h2"
              component="h2"
              gutterBottom
              sx={{ mb: 3, fontWeight: 600, color: 'white' }}
            >
              Ready to Simplify Your Taxes?
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: '1.125rem',
                mb: 4,
                opacity: 0.95,
                maxWidth: 600,
                mx: 'auto',
              }}
            >
              Join thousands of Nigerians who are taking control of their tax compliance with
              Kamafile.
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="center"
            >
              <Button
                component={RouterLink}
                to="/signup"
                variant="contained"
                size="large"
                sx={{
                  bgcolor: 'secondary.main',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  '&:hover': { bgcolor: 'secondary.dark' },
                }}
              >
                Get Started Free
              </Button>
              <Button
                component={RouterLink}
                to="/signin"
                variant="outlined"
                size="large"
                sx={{
                  borderColor: 'white',
                  color: 'white',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                Sign In
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ py: 6, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 4,
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
                KAMAFILE
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Nigeria's Digital Tax Assistant
              </Typography>
            </Box>
            <Box>
              <Stack spacing={1}>
                <Link component={RouterLink} to="/" color="text.secondary" underline="hover">
                  Home
                </Link>
                <Link component={RouterLink} to="/about" color="text.secondary" underline="hover">
                  About
                </Link>
                <Link href="#" color="text.secondary" underline="hover">
                  Privacy Policy
                </Link>
                <Link href="#" color="text.secondary" underline="hover">
                  Terms of Service
                </Link>
              </Stack>
            </Box>
          </Box>
          <Box sx={{ mt: 4, pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" align="center">
              © {new Date().getFullYear()} Kamafile. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}
