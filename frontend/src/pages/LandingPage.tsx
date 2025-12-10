import { Link as RouterLink } from 'react-router-dom'
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Link,
  IconButton,
} from '@mui/material'
import {
  Description as DocumentIcon,
  CalendarToday as CalendarIcon,
  AccountBalance as TaxIcon,
  Category as CategoryIcon,
  Groups as ClinicIcon,
  Lock as LockIcon,
  VerifiedUser as ShieldIcon,
  CheckCircle as CheckIcon,
  PersonAdd as PersonAddIcon,
  Login as LoginIcon,
  LinkedIn as LinkedInIcon,
  Instagram as InstagramIcon,
  X as XIcon,
} from '@mui/icons-material'
import Header from '../components/Header'

export default function LandingPage() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Header />

      {/* SECTION 1: Hero */}
      <Box
        sx={{
          minHeight: '90vh',
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'background.default',
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 4,
              alignItems: 'center',
            }}
          >
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 58.33%' } }}>
              <Typography variant="h1" component="h1" gutterBottom sx={{ mb: 3 }}>
                Nigeria's Digital Tax Assistant
              </Typography>
              <Typography variant="h5" color="text.secondary" sx={{ mb: 4, fontWeight: 400 }}>
                Simple. Private. Always-available tax guidance and document storage
                for individuals, freelancers and micro-businesses.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  href="https://wa.me/234XXXXXXXXXX"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  size="large"
                  startIcon={<PersonAddIcon />}
                  sx={{
                    bgcolor: 'secondary.main',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': { bgcolor: 'secondary.dark' },
                  }}
                >
                  Start on WhatsApp
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  href="#features"
                  sx={{
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': { borderColor: 'primary.dark', bgcolor: 'primary.light', color: 'white' },
                  }}
                >
                  Explore Features
                </Button>
              </Stack>
            </Box>
            <Box
              sx={{
                flex: { xs: '1 1 100%', md: '1 1 41.67%' },
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 300,
              }}
            >
              <Box
                component="img"
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop&q=80"
                alt="Modern financial dashboard and analytics"
                sx={{
                  width: '100%',
                  height: 'auto',
                  minHeight: 300,
                  borderRadius: 4,
                  objectFit: 'cover',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
              />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* SECTION 2: Problem Explanation */}
      <Box id="about" sx={{ py: 10, bgcolor: 'background.paper', scrollMarginTop: '80px' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" component="h2" align="center" gutterBottom sx={{ mb: 6 }}>
            Why Nigerians Struggle With Tax
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 4,
            }}
          >
            {[
              { text: 'Tax rules are confusing and unclear' },
              { text: 'Documents get lost or scattered' },
              { text: 'Filing and deadlines create anxiety' },
            ].map((item, index) => (
              <Box key={index} sx={{ flex: { xs: '1 1 100%', md: '1 1 33.33%' } }}>
                <Card>
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {item.text}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mt: 4, maxWidth: 800, mx: 'auto' }}>
            The 2026 reforms will increase complexity. Most people don't know what documents
            to keep or how to stay compliant.
          </Typography>
        </Container>
      </Box>

      {/* SECTION 3: What Kamafile Does */}
      <Box id="features" sx={{ py: 10, bgcolor: 'background.default', scrollMarginTop: '80px' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" component="h2" align="center" gutterBottom sx={{ mb: 8 }}>
            What Kamafile Helps You Do
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 4,
            }}
          >
            {[
              { icon: <TaxIcon />, title: 'Personalized Tax Guidance', color: 'primary.main' },
              { icon: <CategoryIcon />, title: 'Multi-income Categorization', color: 'secondary.main' },
              { icon: <DocumentIcon />, title: 'Secure Document Vault', color: 'primary.main' },
              { icon: <CalendarIcon />, title: 'Deadline Reminders', color: 'secondary.main' },
              { icon: <DocumentIcon />, title: 'OCR / Document Interpretation', color: 'primary.main' },
              { icon: <ClinicIcon />, title: 'Virtual Tax Clinics', subtitle: 'Coming soon', color: 'secondary.main' },
            ].map((feature, index) => (
              <Box key={index} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 16px)', md: '1 1 calc(33.33% - 22px)' }, minWidth: { xs: '100%', sm: '280px' } }}>
                <Card>
                  <CardContent sx={{ p: 4, textAlign: 'center', minHeight: 200 }}>
                    <Box
                      sx={{
                        color: feature.color,
                        mb: 2,
                        '& svg': { fontSize: 48 },
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" gutterBottom>
                      {feature.title}
                    </Typography>
                    {feature.subtitle && (
                      <Typography variant="body2" color="text.secondary">
                        {feature.subtitle}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* SECTION 4: Who It's For */}
      <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" component="h2" align="center" gutterBottom sx={{ mb: 8 }}>
            Who We Help
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 4,
            }}
          >
            {[
              { title: 'Employees', desc: 'PAYE, PIT basics' },
              { title: 'Freelancers', desc: 'VAT, WHT logic' },
              { title: 'Micro-Business Owners', desc: 'Receipts, VAT' },
              { title: 'SMEs', desc: 'Overview, summaries, routing' },
            ].map((user, index) => (
              <Box key={index} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 16px)', md: '1 1 calc(25% - 24px)' }, minWidth: { xs: '100%', sm: '280px' } }}>
                <Card>
                  <CardContent sx={{ p: 4, textAlign: 'center', minHeight: 150 }}>
                    <Typography variant="h6" gutterBottom>
                      {user.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* SECTION 5: How It Works */}
      <Box id="how-it-works" sx={{ py: 10, bgcolor: 'background.default', scrollMarginTop: '80px' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" component="h2" align="center" gutterBottom sx={{ mb: 8 }}>
            How It Works
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              flexWrap: 'wrap',
              gap: 3,
              justifyContent: 'center',
            }}
          >
            {[
              { step: '1', title: 'Create an account' },
              { step: '2', title: 'Answer a few questions' },
              { step: '3', title: 'Get personalized guidance' },
              { step: '4', title: 'Store your documents safely' },
              { step: '5', title: 'Receive reminders and next steps' },
            ].map((item, index) => (
              <Card key={index} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(20% - 24px)' }, maxWidth: { md: 220 } }}>
                <CardContent sx={{ p: 4, textAlign: 'center', minHeight: 200 }}>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      bgcolor: 'secondary.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                      fontSize: '1.5rem',
                      fontWeight: 700,
                    }}
                  >
                    {item.step}
                  </Box>
                  <Typography variant="h6">{item.title}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Container>
      </Box>

      {/* SECTION 6: Why Trust Kamafile */}
      <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" component="h2" align="center" gutterBottom sx={{ mb: 8 }}>
            Private. Secure. NDPA-Compliant.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 4,
              mb: 4,
            }}
          >
            {[
              { icon: <LockIcon />, title: 'End-to-end encryption' },
              { icon: <ShieldIcon />, title: 'PIN-protected access' },
              { icon: <CheckIcon />, title: 'You control your data' },
            ].map((trust, index) => (
              <Box key={index} sx={{ flex: { xs: '1 1 100%', md: '1 1 33.33%' } }}>
                <Card>
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Box
                      sx={{
                        color: 'secondary.main',
                        mb: 2,
                        '& svg': { fontSize: 48 },
                      }}
                    >
                      {trust.icon}
                    </Box>
                    <Typography variant="h6">{trust.title}</Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            We never share your documents without permission.
          </Typography>
        </Container>
      </Box>

      {/* SECTION 7: UI Preview */}
      <Box sx={{ py: 10, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" component="h2" align="center" gutterBottom sx={{ mb: 6 }}>
            A simple dashboard for complex tax situations
          </Typography>
          <Box
            component="img"
            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=600&fit=crop&q=80"
            alt="Dashboard preview showing analytics and data visualization"
            sx={{
              width: '100%',
              height: 'auto',
              minHeight: 400,
              borderRadius: 4,
              objectFit: 'cover',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
          />
        </Container>
      </Box>

      {/* SECTION 8: Education & Content */}
      <Box id="resources" sx={{ py: 10, bgcolor: 'background.paper', scrollMarginTop: '80px' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" component="h2" align="center" gutterBottom sx={{ mb: 8 }}>
            Tax Basics Made Simple
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 4,
            }}
          >
            {[
              { title: 'What income is taxable in Nigeria?' },
              { title: '2026 reforms explained' },
              { title: 'What documents should I keep?' },
            ].map((article, index) => (
              <Box key={index} sx={{ flex: { xs: '1 1 100%', md: '1 1 33.33%' } }}>
                <Card>
                  <CardContent sx={{ p: 4, minHeight: 150 }}>
                    <Typography variant="h6" gutterBottom>
                      {article.title}
                    </Typography>
                    <Button variant="text" color="secondary" sx={{ mt: 2 }}>
                      Read more →
                    </Button>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* SECTION 9: Final CTA */}
      <Box id="pricing" sx={{ py: 10, bgcolor: 'primary.main', color: 'white', scrollMarginTop: '80px' }}>
        <Container maxWidth="md">
          <Typography variant="h2" component="h2" align="center" gutterBottom sx={{ mb: 4, color: 'white' }}>
            Ready to simplify your taxes?
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mb: 3 }}>
            <Button
              href="https://wa.me/234XXXXXXXXXX"
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              size="large"
              startIcon={<PersonAddIcon />}
              sx={{
                bgcolor: 'secondary.main',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': { bgcolor: 'secondary.dark' },
              }}
            >
              Start on WhatsApp
            </Button>
            <Button
              component={RouterLink}
              to="/signin"
              variant="outlined"
              size="large"
              startIcon={<LoginIcon />}
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
          <Typography variant="body2" align="center" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            Free for early users. No downloads required.
          </Typography>
        </Container>
      </Box>

      {/* FOOTER */}
      <Box component="footer" id="contact" sx={{ py: 6, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', scrollMarginTop: '80px' }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 4,
            }}
          >
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 50%' } }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
                KAMAFILE
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Nigeria's Digital Tax Assistant
              </Typography>
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 50%' } }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                  <Stack spacing={1}>
                    <Link href="#" color="text.secondary" underline="hover">About</Link>
                    <Link href="#" color="text.secondary" underline="hover">How It Works</Link>
                  </Stack>
                </Box>
                <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                  <Stack spacing={1}>
                    <Link href="#" color="text.secondary" underline="hover">Pricing</Link>
                    <Link href="#" color="text.secondary" underline="hover">Resources</Link>
                  </Stack>
                </Box>
                <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                  <Stack spacing={1}>
                    <Link href="#" color="text.secondary" underline="hover">Privacy</Link>
                    <Link href="#" color="text.secondary" underline="hover">Contact</Link>
                  </Stack>
                </Box>
                <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                  <Stack direction="row" spacing={2}>
                    <IconButton size="small" href="#" target="_blank">
                      <LinkedInIcon />
                    </IconButton>
                    <IconButton size="small" href="#" target="_blank">
                      <InstagramIcon />
                    </IconButton>
                    <IconButton size="small" href="#" target="_blank">
                      <XIcon />
                    </IconButton>
                  </Stack>
                </Box>
              </Box>
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
