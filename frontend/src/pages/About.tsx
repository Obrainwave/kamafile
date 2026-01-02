import { Link as RouterLink } from 'react-router-dom'
import {
  Building2,
  Shield,
  Users,
  Lightbulb,
  ShieldCheck,
  Zap,
  HeadphonesIcon,
} from 'lucide-react'
import Header from '../components/Header'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Container from '../components/ui/Container'

export default function About() {
  const values = [
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'Your tax documents and information are encrypted and secure. We never share your data without permission.',
    },
    {
      icon: Lightbulb,
      title: 'Innovation',
      description: 'Leveraging AI and modern technology to simplify complex tax processes for Nigerians.',
    },
    {
      icon: ShieldCheck,
      title: 'Trust & Compliance',
      description: 'NDPA-compliant and built with transparency. You control your data at all times.',
    },
    {
      icon: Zap,
      title: 'Efficiency',
      description: 'Get instant answers to tax questions and automated reminders for important deadlines.',
    },
    {
      icon: HeadphonesIcon,
      title: 'Always Available',
      description: '24/7 access via WhatsApp and web platform. Get help when you need it, not just business hours.',
    },
    {
      icon: Users,
      title: 'For Everyone',
      description: 'Designed for individuals, freelancers, micro-businesses, and SMEs across Nigeria.',
    },
  ]

  return (
    <div className="flex-grow min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <div className="bg-primary text-white py-16 md:py-24 relative overflow-hidden">
        <Container maxWidth="lg">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              About Kamafile
            </h1>
            <h2 className="text-xl md:text-2xl font-normal opacity-95 leading-relaxed mb-6">
              Nigeria's Digital Tax Assistant
            </h2>
            <p className="text-lg md:text-xl opacity-90 leading-relaxed max-w-2xl mx-auto">
              We're on a mission to make tax compliance simple, accessible, and stress-free for every Nigerian.
            </p>
          </div>
        </Container>
      </div>

      {/* Mission Section */}
      <div className="py-16 md:py-20 bg-white">
        <Container maxWidth="lg">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-semibold mb-6">
              Our Mission
            </h2>
            <p className="text-lg leading-relaxed text-gray-600 mb-4">
              Tax compliance in Nigeria is complex and overwhelming. With the 2026 tax reforms
              increasing complexity, millions of Nigerians struggle to understand their obligations,
              keep proper records, and meet deadlines.
            </p>
            <p className="text-lg leading-relaxed text-gray-600">
              Kamafile exists to change that. We provide personalized tax guidance, secure document
              storage, and automated reminders—all accessible via WhatsApp and web. Our AI-powered
              assistant helps you understand your tax situation, categorize your income, and stay
              compliant without the stress.
            </p>
          </div>
        </Container>
      </div>

      {/* What We Do Section */}
      <div className="py-16 md:py-20 bg-gray-50">
        <Container maxWidth="lg">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-12">
            What We Do
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-8 h-full">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-6">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">
                Personalized Tax Guidance
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Get answers to your tax questions tailored to your specific situation. Our AI
                assistant understands Nigerian tax laws and helps you navigate complexity.
              </p>
            </Card>
            <Card className="p-8 h-full">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">
                Secure Document Vault
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Store all your tax-related documents in one secure, encrypted location. Access
                them anytime, anywhere, with PIN protection and end-to-end encryption.
              </p>
            </Card>
            <Card className="p-8 h-full">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">
                Automated Reminders
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Never miss a tax deadline again. We send you timely reminders for filing
                deadlines, payment dates, and important tax events.
              </p>
            </Card>
            <Card className="p-8 h-full">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">
                Multi-Income Support
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Whether you're an employee, freelancer, or business owner with multiple income
                streams, we help you categorize and manage everything in one place.
              </p>
            </Card>
          </div>
        </Container>
      </div>

      {/* Values Section */}
      <div className="py-16 md:py-20 bg-white">
        <Container maxWidth="lg">
          <h2 className="text-3xl md:text-4xl font-semibold text-center mb-12">
            Our Values
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {values.map((value, index) => {
              const IconComponent = value.icon
              return (
                <Card key={index} className="p-8 h-full text-center">
                  <div className="text-secondary mb-4 flex justify-center">
                    <IconComponent className="w-12 h-12" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {value.description}
                  </p>
                </Card>
              )
            })}
          </div>
        </Container>
      </div>

      {/* CTA Section */}
      <div className="py-16 md:py-20 bg-primary text-white">
        <Container maxWidth="md">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-semibold mb-6 text-white">
              Ready to Simplify Your Taxes?
            </h2>
            <p className="text-lg md:text-xl mb-8 opacity-95 max-w-2xl mx-auto">
              Join thousands of Nigerians who are taking control of their tax compliance with
              Kamafile.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                component={RouterLink}
                to="/signup"
                variant="secondary"
                size="lg"
                className="px-8 py-4 text-lg"
              >
                Get Started Free
              </Button>
              <Button
                component={RouterLink}
                to="/signin"
                variant="outline"
                size="lg"
                className="px-8 py-4 text-lg border-white text-white hover:bg-white hover:text-primary"
              >
                Sign In
              </Button>
            </div>
          </div>
        </Container>
      </div>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-gray-200">
        <Container maxWidth="lg">
          <div className="flex flex-col md:flex-row gap-8 justify-between">
            <div>
              <h5 className="text-2xl font-bold mb-4 text-primary">
                KAMAFILE
              </h5>
              <p className="text-gray-600 text-sm">
                Nigeria's Digital Tax Assistant
              </p>
            </div>
            <div>
              <div className="flex flex-col gap-2">
                <RouterLink to="/" className="text-gray-600 hover:text-primary text-sm">
                  Home
                </RouterLink>
                <RouterLink to="/about" className="text-gray-600 hover:text-primary text-sm">
                  About
                </RouterLink>
                <a href="#" className="text-gray-600 hover:text-primary text-sm">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-600 hover:text-primary text-sm">
                  Terms of Service
                </a>
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
