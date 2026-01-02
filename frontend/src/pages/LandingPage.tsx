import { useState, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  ShieldCheck,
  CheckCircle,
  UserPlus,
  Linkedin,
  Instagram,
  Twitter,
  Lightbulb,
  FolderOpen,
  FileText,
  TrendingUp,
  HelpCircle,
  Search,
  Wrench,
  Building2,
} from 'lucide-react'
import { adminAPI, Banner } from '../services/adminAPI'
import Header from '../components/Header'
import ChatWizard from '../components/ChatWizard'
import hBlackLogo from '../assets/images/h-black-logo.jpeg'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Container from '../components/ui/Container'
import Spinner from '../components/ui/Spinner'

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
      <div className="flex-grow">
        <Header />
        <div className="min-h-[90vh] flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
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
    <div className="flex-grow">
      <Header />

      {/* SECTION 1: Hero Banner Slider */}
      <div className="min-h-[90vh] flex items-center bg-gray-50 py-16 relative overflow-hidden">
        <Container maxWidth="lg" className="relative overflow-hidden">
          <div className="relative w-full overflow-hidden">
            {displayBanners.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-2 md:-left-16 top-1/2 -translate-y-1/2 bg-white shadow-lg z-10 p-2 rounded-full hover:bg-gray-50 transition hidden md:flex items-center justify-center"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-2 md:-right-16 top-1/2 -translate-y-1/2 bg-white shadow-lg z-10 p-2 rounded-full hover:bg-gray-50 transition hidden md:flex items-center justify-center"
                >
                  <ChevronRight className="w-6 h-6 text-gray-700" />
                </button>
              </>
            )}

            <div
              className="flex transition-transform duration-600 ease-in-out"
              style={{ width: `${displayBanners.length * 100}%`, transform: `translateX(-${currentSlide * (100 / displayBanners.length)}%)` }}
            >
              {displayBanners.map((banner, index) => (
                <div
                  key={banner.id}
                  className="flex flex-col md:flex-row gap-8 items-center px-0 md:px-4"
                  style={{ width: `${100 / displayBanners.length}%`, flexShrink: 0 }}
                >
                  <div className="flex-1 md:flex-[58.33%]">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">{banner.title}</h1>
                    {banner.description && (
                      <h2 className="text-xl md:text-2xl text-gray-600 mb-6 font-normal">
                        {banner.description}
                      </h2>
                    )}
                  </div>
                  <div className="flex-1 md:flex-[41.67%] flex justify-center items-center min-h-[300px]">
                    <img
                      src={banner.image_url || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop&q=80'}
                      alt={banner.title}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="w-full h-auto min-h-[300px] rounded-2xl object-cover shadow-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Slide Indicators */}
          {displayBanners.length > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {displayBanners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleSlideClick(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-primary' : 'bg-gray-300'
                  } hover:bg-primary-dark`}
                />
              ))}
            </div>
          )}
        </Container>
      </div>

      {/* SECTION 2: Primary Entry Points */}
      <div className="py-16 bg-white">
        <Container maxWidth="md">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-8">Try Kamafile Now</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <Button
              onClick={() => setChatWizardOpen(true)}
              variant="primary"
              size="lg"
              className="flex items-center justify-center gap-2 flex-1 sm:flex-[50%]"
            >
              <HelpCircle className="w-5 h-5" />
              Get Started (Web)
            </Button>
            <a
              href="https://wa.me/234XXXXXXXXXX"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 text-lg font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all inline-flex items-center justify-center gap-2 flex-1 sm:flex-[50%]"
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
              <UserPlus className="w-5 h-5" />
              Get Started (WhatsApp)
            </a>
          </div>
          <p className="text-sm text-gray-600 text-center mt-4">
            Start with a quick chat - no account needed. You can switch to WhatsApp anytime.
          </p>
        </Container>
      </div>

      {/* SECTION 3: The Problem */}
      <div id="about" className="py-20 bg-gray-50 scroll-mt-20">
        <Container maxWidth="lg">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-4">The Problem</h2>
          <h3 className="text-xl text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Many people struggle with taxes because they lack clarity and guidance
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
            {[
              {
                icon: HelpCircle,
                title: 'What taxes apply to them',
                description: 'Uncertainty about which tax obligations are relevant to their specific situation',
                color: 'border-l-red-500',
              },
              {
                icon: Search,
                title: 'Where to start',
                description: 'Overwhelmed by the complexity and unsure of the first steps to take',
                color: 'border-l-yellow-500',
              },
              {
                icon: Wrench,
                title: 'How to prepare properly',
                description: 'Lack of knowledge on proper documentation and filing requirements',
                color: 'border-l-red-500',
              },
            ].map((item, index) => {
              const IconComponent = item.icon
              return (
                <Card key={index} className={`${item.color} border-l-4 h-full hover:-translate-y-1 transition-transform`}>
                  <div className="p-8 min-h-[200px]">
                    <div className="text-red-500 mb-4">
                      <IconComponent className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4">{item.title}</h3>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                </Card>
              )
            })}
          </div>
          <Card className="max-w-2xl mx-auto border border-gray-200">
            <div className="p-8 text-center">
              <div className="text-gray-600 mb-2 flex justify-center">
                <Building2 className="w-8 h-8" />
              </div>
              <p className="text-lg text-gray-600 italic">
                Most existing tools are built for accountants — not real people.
              </p>
            </div>
          </Card>
        </Container>
      </div>

      {/* SECTION 4: The Solution */}
      <div id="features" className="py-20 bg-white scroll-mt-20">
        <Container maxWidth="lg">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-4">The Solution</h2>
          <h3 className="text-xl text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Kamafile helps you navigate taxes with clarity and confidence
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {
                icon: Lightbulb,
                title: 'Understand relevant taxes',
                description: 'Get clear guidance on what taxes apply to your situation',
                color: 'text-primary',
              },
              {
                icon: FolderOpen,
                title: 'Organise what matters',
                description: 'Keep track of important documents and records in one secure place',
                color: 'text-secondary',
              },
              {
                icon: FileText,
                title: 'Prepare before filing',
                description: 'Get everything ready and organized before tax season',
                color: 'text-primary',
              },
              {
                icon: TrendingUp,
                title: 'Take the right next step',
                description: 'Receive personalized guidance on what to do next with confidence',
                color: 'text-secondary',
              },
            ].map((item, index) => {
              const IconComponent = item.icon
              return (
                <Card key={index} hover className="h-full">
                  <div className="p-8 text-center min-h-[220px]">
                    <div className={`${item.color} mb-4 flex justify-center`}>
                      <IconComponent className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4">{item.title}</h3>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                </Card>
              )
            })}
          </div>
        </Container>
      </div>

      {/* SECTION 5: Capabilities (Beta) */}
      <div className="py-20 bg-gray-50">
        <Container maxWidth="lg">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-12">
            What you can do with Kamafile (Beta)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              'Understand what taxes apply to you',
              'Organise income types and obligations',
              'Know what documents to keep — and why',
              'Prepare for filing and compliance',
              'Get reminders and next-step guidance',
            ].map((capability, index) => (
              <Card key={index} className="min-h-[120px]">
                <div className="p-8">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-gray-900">{capability}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <p className="text-sm text-gray-600 text-center mt-8 italic">
            Capabilities expand in depth and automation as the platform evolves.
          </p>
        </Container>
      </div>

      {/* SECTION 6: Who It's For */}
      <div className="py-20 bg-white">
        <Container maxWidth="lg">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-6">Who Kamafile Is For</h2>
          <p className="text-gray-600 text-center mb-12 max-w-3xl mx-auto">
            Built for people navigating Nigeria's tax system without teams or advisors:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { title: 'Employees', desc: 'PAYE and personal income basics' },
              { title: 'Freelancers', desc: 'VAT, WHT, mixed income' },
              { title: 'Micro-business owners', desc: 'Receipts, records, compliance prep' },
              { title: 'Growing SMEs', desc: 'Summaries, visibility, routing' },
            ].map((user, index) => (
              <Card key={index} className="min-h-[150px]">
                <div className="p-8 text-center">
                  <h3 className="text-xl font-semibold mb-2">{user.title}</h3>
                  <p className="text-gray-600 text-sm">{user.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </div>

      {/* SECTION 7: How It Works (Summary) */}
      <div id="how-it-works" className="py-20 bg-gray-50 scroll-mt-20">
        <Container maxWidth="lg">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 justify-center">
            {[
              { step: '1', title: 'Start on Web or WhatsApp' },
              { step: '2', title: 'Answer a few guided questions' },
              { step: '3', title: 'Get tailored guidance' },
              { step: '4', title: 'Organise documents securely' },
              { step: '5', title: 'Receive reminders and next steps' },
            ].map((item, index) => (
              <Card key={index} className="max-w-[220px] mx-auto">
                <div className="p-8 text-center min-h-[200px]">
                  <div className="w-15 h-15 rounded-full bg-secondary text-white flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </div>

      {/* SECTION 8: Trust & Safety */}
      <div className="py-20 bg-white">
        <Container maxWidth="lg">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-12">
            Private. Secure. Built on trust.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { icon: Lock, title: 'Encrypted document storage' },
              { icon: ShieldCheck, title: 'PIN-protected access' },
              { icon: CheckCircle, title: 'You stay in control of your data' },
            ].map((trust, index) => {
              const IconComponent = trust.icon
              return (
                <Card key={index}>
                  <div className="p-8 text-center">
                    <div className="text-secondary mb-4 flex justify-center">
                      <IconComponent className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-semibold">{trust.title}</h3>
                  </div>
                </Card>
              )
            })}
          </div>
        </Container>
      </div>

      {/* SECTION 9: Product Vision */}
      <div className="py-20 bg-gray-50">
        <Container maxWidth="lg">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-12">
            Where Kamafile is headed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="min-h-[200px]">
              <div className="p-8">
                <h3 className="text-2xl font-semibold text-primary mb-4">Today</h3>
                <p className="text-gray-600">
                  Tax guidance and preparation — clarity before filing.
                </p>
              </div>
            </Card>
            <Card className="min-h-[200px]">
              <div className="p-8">
                <h3 className="text-2xl font-semibold text-secondary mb-4">Next</h3>
                <p className="text-gray-600">
                  Deeper organisation, structured workflows, and smarter insights as the market and data ecosystem mature.
                </p>
              </div>
            </Card>
          </div>
        </Container>
      </div>

      {/* SECTION 10: Final CTA */}
      <div id="pricing" className="py-20 bg-primary text-white scroll-mt-20">
        <Container maxWidth="md">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-8 text-white">
            Ready to simplify your taxes?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button
              onClick={() => setChatWizardOpen(true)}
              variant="secondary"
              size="lg"
              className="flex items-center justify-center gap-2 bg-white text-primary hover:bg-gray-100"
            >
              <UserPlus className="w-5 h-5" />
              Get Started (Web)
            </Button>
            <a
              href="https://wa.me/234XXXXXXXXXX"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 text-lg font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all inline-flex items-center justify-center gap-2"
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
              <UserPlus className="w-5 h-5" />
              Get Started (WhatsApp)
            </a>
          </div>
          <p className="text-sm text-center text-white/80">
            Choose how you want to start. You can switch anytime.
          </p>
        </Container>
      </div>

      {/* Chat Wizard Modal */}
      <ChatWizard open={chatWizardOpen} onClose={() => setChatWizardOpen(false)} />

      {/* FOOTER */}
      <footer id="contact" className="py-12 bg-white border-t border-gray-200 scroll-mt-20">
        <Container maxWidth="lg">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 md:flex-[50%]">
              <img
                src={hBlackLogo}
                alt="Kamafile Logo"
                className="h-12 md:h-14 w-auto object-contain mb-4"
              />
              <p className="text-gray-600 text-sm">
                Nigeria's Digital Tax Assistant
              </p>
            </div>
            <div className="flex-1 md:flex-[50%]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="flex flex-col gap-2">
                    <a href="#" className="text-gray-600 hover:text-primary text-sm">About</a>
                    <a href="#" className="text-gray-600 hover:text-primary text-sm">How It Works</a>
                  </div>
                </div>
                <div>
                  <div className="flex flex-col gap-2">
                    <a href="#" className="text-gray-600 hover:text-primary text-sm">Pricing</a>
                    <a href="#" className="text-gray-600 hover:text-primary text-sm">Resources</a>
                  </div>
                </div>
                <div>
                  <div className="flex flex-col gap-2">
                    <a href="#" className="text-gray-600 hover:text-primary text-sm">Privacy</a>
                    <a href="#" className="text-gray-600 hover:text-primary text-sm">Contact</a>
                  </div>
                </div>
                <div>
                  <div className="flex gap-3">
                    <a href="#" target="_blank" className="p-2 text-gray-600 hover:text-primary">
                      <Linkedin className="w-5 h-5" />
                    </a>
                    <a href="#" target="_blank" className="p-2 text-gray-600 hover:text-primary">
                      <Instagram className="w-5 h-5" />
                    </a>
                    <a href="#" target="_blank" className="p-2 text-gray-600 hover:text-primary">
                      <Twitter className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-gray-600 text-sm text-center">
              © {new Date().getFullYear()} Kamafile. All rights reserved.
            </p>
          </div>
        </Container>
      </footer>
    </div>
  )
}
