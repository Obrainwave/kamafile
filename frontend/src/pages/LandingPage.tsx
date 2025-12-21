import { useState, useEffect } from 'react'
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
  ArrowBackIos,
  ArrowForwardIos,
} from '@mui/icons-material'
import { adminAPI, Banner } from '../services/adminAPI'
import {
  Lock as LockIcon,
  VerifiedUser as ShieldIcon,
  CheckCircle as CheckIcon,
  PersonAdd as PersonAddIcon,
  LinkedIn as LinkedInIcon,
  Instagram as InstagramIcon,
  X as XIcon,
  Lightbulb as LightbulbIcon,
  FolderOpen as FolderIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  HelpOutline as HelpIcon,
  Search as SearchIcon,
  Build as BuildIcon,
  BusinessCenter as BusinessIcon,
} from '@mui/icons-material'
import Header from '../components/Header'
import ChatWizard from '../components/ChatWizard'
import hBlackLogo from '../assets/images/h-black-logo.jpeg'

export default function LandingPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(true)
  const [chatWizardOpen, setChatWizardOpen] = useState(false)

  useEffect(() => {
    loadBanners()
  }, [])

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % banners.length)
      }, 5000) // Auto-advance every 5 seconds
      return () => clearInterval(interval)
    }
  }, [banners.length])

  const loadBanners = async () => {
    try {
      const data = await adminAPI.getPublicBanners()
      setBanners(data)
      if (data.length > 0) {
        setCurrentSlide(0)
      }
    } catch (error) {
      console.error('Failed to load banners:', error)
      // Fallback to default banner if API fails
      setBanners([{
        id: 'default',
        title: 'Helping Nigerians Understand and Navigate Tax',
        description: 'Clear tax guidance, document organisation, and compliance preparation for individuals, freelancers, and micro-businesses — starting simple, growing with you.',
        image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop&q=80',
        order: 0,
        is_active: true,
        created_at: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handlePrevious = () => {
    if (banners.length === 0) return
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length)
  }

  const handleNext = () => {
    if (banners.length === 0) return
    setCurrentSlide((prev) => (prev + 1) % banners.length)
  }

  const handleSlideClick = (index: number) => {
    if (banners.length === 0) return
    setCurrentSlide(index)
  }

  if (loading) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <Header />
        <Box sx={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography>Loading...</Typography>
        </Box>
      </Box>
    )
  }

  // Default banner if none exist
  const defaultBanner: Banner = {
    id: 'default',
    title: 'Helping Nigerians Understand and Navigate Tax',
    description: 'Clear tax guidance, document organisation, and compliance preparation for individuals, freelancers, and micro-businesses — starting simple, growing with you.',
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop&q=80',
    order: 0,
    is_active: true,
    created_at: new Date().toISOString(),
  }

  const displayBanners = banners.length > 0 ? banners : [defaultBanner]

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Header />

      {/* SECTION 1: Hero Banner Slider */}
      <Box
        sx={{
          minHeight: '90vh',
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'background.default',
          py: 8,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', overflow: 'hidden' }}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              overflow: 'hidden',
            }}
          >
            {displayBanners.length > 1 && (
              <>
                <IconButton
                  onClick={handlePrevious}
                  sx={{
                    position: 'absolute',
                    left: { xs: 8, md: -60 },
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'background.paper',
                    boxShadow: 2,
                    zIndex: 3,
                    '&:hover': {
                      bgcolor: 'background.paper',
                    },
                  }}
                >
                  <ArrowBackIos />
                </IconButton>
                <IconButton
                  onClick={handleNext}
                  sx={{
                    position: 'absolute',
                    right: { xs: 8, md: -60 },
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'background.paper',
                    boxShadow: 2,
                    zIndex: 3,
                    '&:hover': {
                      bgcolor: 'background.paper',
                    },
                  }}
                >
                  <ArrowForwardIos />
                </IconButton>
              </>
            )}

            <Box
              sx={{
                display: 'flex',
                width: `${displayBanners.length * 100}%`,
                transform: `translateX(-${currentSlide * (100 / displayBanners.length)}%)`,
                transition: 'transform 0.6s ease-in-out',
              }}
            >
              {displayBanners.map((banner, index) => (
                <Box
                  key={banner.id}
                  sx={{
                    width: `${100 / banners.length}%`,
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 4,
                    alignItems: 'center',
                    px: { xs: 0, md: 2 },
                  }}
                >
                  <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 58.33%' } }}>
                    <Typography variant="h1" component="h1" gutterBottom sx={{ mb: 3 }}>
                      {banner.title}
                    </Typography>
                    {banner.description && (
                      <Typography variant="h5" color="text.secondary" sx={{ mb: 3, fontWeight: 400 }}>
                        {banner.description}
                      </Typography>
                    )}
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
                      src={banner.image_url || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop&q=80'}
                      alt={banner.title}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
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
              ))}
            </Box>
          </Box>

          {/* Slide Indicators */}
          {displayBanners.length > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 4 }}>
              {displayBanners.map((_, index) => (
                <Box
                  key={index}
                  onClick={() => handleSlideClick(index)}
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: index === currentSlide ? 'primary.main' : 'action.disabled',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s',
                    '&:hover': {
                      bgcolor: index === currentSlide ? 'primary.dark' : 'action.active',
                    },
                  }}
                />
              ))}
            </Box>
          )}
        </Container>
      </Box>

      {/* SECTION 2: Primary Entry Points */}
      <Box sx={{ py: 8, bgcolor: 'background.paper' }}>
        <Container maxWidth="md">
          <Typography variant="h4" component="h2" align="center" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
            Try Kamafile Now
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mb: 2 }}>
            <Button
              onClick={() => setChatWizardOpen(true)}
              variant="contained"
              size="large"
              startIcon={<HelpIcon />}
              sx={{
                bgcolor: 'primary.main',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                flex: { xs: '1 1 100%', sm: '1 1 50%' },
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              Get Started (Web)
            </Button>
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
                flex: { xs: '1 1 100%', sm: '1 1 50%' },
                '&:hover': { bgcolor: 'secondary.dark' },
              }}
            >
              Get Started (WhatsApp)
            </Button>
          </Stack>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 2 }}>
            Start with a quick chat - no account needed. You can switch to WhatsApp anytime.
          </Typography>
        </Container>
      </Box>

      {/* SECTION 3: The Problem */}
      <Box id="about" sx={{ py: 10, bgcolor: 'background.default', scrollMarginTop: '80px' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" component="h2" align="center" gutterBottom sx={{ mb: 2 }}>
            The Problem
          </Typography>
          <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 8, maxWidth: 600, mx: 'auto' }}>
            Many people struggle with taxes because they lack clarity and guidance
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              flexWrap: 'wrap',
              gap: 4,
              mb: 6,
            }}
          >
            {[
              {
                icon: <HelpIcon />,
                title: 'What taxes apply to them',
                description: 'Uncertainty about which tax obligations are relevant to their specific situation',
                color: 'error.main',
              },
              {
                icon: <SearchIcon />,
                title: 'Where to start',
                description: 'Overwhelmed by the complexity and unsure of the first steps to take',
                color: 'warning.main',
              },
              {
                icon: <BuildIcon />,
                title: 'How to prepare properly',
                description: 'Lack of knowledge on proper documentation and filing requirements',
                color: 'error.main',
              },
            ].map((item, index) => (
              <Box
                key={index}
                sx={{
                  flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 16px)', md: '1 1 calc(33.33% - 22px)' },
                  minWidth: { xs: '100%', sm: '280px' },
                }}
              >
                <Card
                  sx={{
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    borderLeft: `4px solid ${item.color}`,
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ p: 4, minHeight: 200 }}>
                    <Box
                      sx={{
                        color: item.color,
                        mb: 2,
                        display: 'flex',
                        justifyContent: 'flex-start',
                        '& svg': { fontSize: 40 },
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
          <Card
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              maxWidth: 800,
              mx: 'auto',
            }}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Box
                sx={{
                  color: 'text.secondary',
                  mb: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  '& svg': { fontSize: 32 },
                }}
              >
                <BusinessIcon />
              </Box>
              <Typography variant="h6" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Most existing tools are built for accountants — not real people.
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>

      {/* SECTION 4: The Solution */}
      <Box id="features" sx={{ py: 10, bgcolor: 'background.paper', scrollMarginTop: '80px' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" component="h2" align="center" gutterBottom sx={{ mb: 2 }}>
            The Solution
          </Typography>
          <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 8, maxWidth: 600, mx: 'auto' }}>
            Kamafile helps you navigate taxes with clarity and confidence
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              flexWrap: 'wrap',
              gap: 4,
            }}
          >
            {[
              {
                icon: <LightbulbIcon />,
                title: 'Understand relevant taxes',
                description: 'Get clear guidance on what taxes apply to your situation',
                color: 'primary.main',
              },
              {
                icon: <FolderIcon />,
                title: 'Organise what matters',
                description: 'Keep track of important documents and records in one secure place',
                color: 'secondary.main',
              },
              {
                icon: <AssignmentIcon />,
                title: 'Prepare before filing',
                description: 'Get everything ready and organized before tax season',
                color: 'primary.main',
              },
              {
                icon: <TrendingUpIcon />,
                title: 'Take the right next step',
                description: 'Receive personalized guidance on what to do next with confidence',
                color: 'secondary.main',
              },
            ].map((item, index) => (
              <Box
                key={index}
                sx={{
                  flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 16px)', md: '1 1 calc(25% - 24px)' },
                  minWidth: { xs: '100%', sm: '280px' },
                }}
              >
                <Card
                  sx={{
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ p: 4, textAlign: 'center', minHeight: 220 }}>
                    <Box
                      sx={{
                        color: item.color,
                        mb: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        '& svg': { fontSize: 48 },
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* SECTION 5: Capabilities (Beta) */}
      <Box sx={{ py: 10, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" component="h2" align="center" gutterBottom sx={{ mb: 8 }}>
            What you can do with Kamafile (Beta)
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
              'Understand what taxes apply to you',
              'Organise income types and obligations',
              'Know what documents to keep — and why',
              'Prepare for filing and compliance',
              'Get reminders and next-step guidance',
            ].map((capability, index) => (
              <Box key={index} sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 16px)', md: '1 1 calc(33.33% - 22px)' }, minWidth: { xs: '100%', sm: '280px' } }}>
                <Card>
                  <CardContent sx={{ p: 4, minHeight: 120 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <CheckIcon sx={{ color: 'primary.main', mt: 0.5 }} />
                      <Typography variant="body1">{capability}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 4, fontStyle: 'italic' }}>
            Capabilities expand in depth and automation as the platform evolves.
          </Typography>
        </Container>
      </Box>

      {/* SECTION 6: Who It's For */}
      <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" component="h2" align="center" gutterBottom sx={{ mb: 4 }}>
            Who Kamafile Is For
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 6, maxWidth: 800, mx: 'auto' }}>
            Built for people navigating Nigeria's tax system without teams or advisors:
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
              { title: 'Employees', desc: 'PAYE and personal income basics' },
              { title: 'Freelancers', desc: 'VAT, WHT, mixed income' },
              { title: 'Micro-business owners', desc: 'Receipts, records, compliance prep' },
              { title: 'Growing SMEs', desc: 'Summaries, visibility, routing' },
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

      {/* SECTION 7: How It Works (Summary) */}
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
              { step: '1', title: 'Start on Web or WhatsApp' },
              { step: '2', title: 'Answer a few guided questions' },
              { step: '3', title: 'Get tailored guidance' },
              { step: '4', title: 'Organise documents securely' },
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

      {/* SECTION 8: Trust & Safety */}
      <Box sx={{ py: 10, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" component="h2" align="center" gutterBottom sx={{ mb: 8 }}>
            Private. Secure. Built on trust.
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
              { icon: <LockIcon />, title: 'Encrypted document storage' },
              { icon: <ShieldIcon />, title: 'PIN-protected access' },
              { icon: <CheckIcon />, title: 'You stay in control of your data' },
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
        </Container>
      </Box>

      {/* SECTION 9: Product Vision */}
      <Box sx={{ py: 10, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Typography variant="h2" component="h2" align="center" gutterBottom sx={{ mb: 8 }}>
            Where Kamafile is headed
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 4,
            }}
          >
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 50%' } }}>
              <Card>
                <CardContent sx={{ p: 4, minHeight: 200 }}>
                  <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
                    Today
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Tax guidance and preparation — clarity before filing.
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 50%' } }}>
              <Card>
                <CardContent sx={{ p: 4, minHeight: 200 }}>
                  <Typography variant="h5" gutterBottom sx={{ color: 'secondary.main', mb: 2 }}>
                    Next
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Deeper organisation, structured workflows, and smarter insights as the market and data ecosystem mature.
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* SECTION 10: Final CTA */}
      <Box id="pricing" sx={{ py: 10, bgcolor: 'primary.main', color: 'white', scrollMarginTop: '80px' }}>
        <Container maxWidth="md">
          <Typography variant="h2" component="h2" align="center" gutterBottom sx={{ mb: 4, color: 'white' }}>
            Ready to simplify your taxes?
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mb: 3 }}>
            <Button
              onClick={() => setChatWizardOpen(true)}
              variant="contained"
              size="large"
              startIcon={<PersonAddIcon />}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
              }}
            >
              Get Started (Web)
            </Button>
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
              Get Started (WhatsApp)
            </Button>
          </Stack>
          <Typography variant="body2" align="center" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            Choose how you want to start. You can switch anytime.
          </Typography>
        </Container>
      </Box>

      {/* Chat Wizard Modal */}
      <ChatWizard open={chatWizardOpen} onClose={() => setChatWizardOpen(false)} />

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
              <Box
                component="img"
                src={hBlackLogo}
                alt="Kamafile Logo"
                sx={{
                  height: { xs: 48, md: 56 },
                  width: 'auto',
                  objectFit: 'contain',
                  mb: 2,
                }}
              />
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
