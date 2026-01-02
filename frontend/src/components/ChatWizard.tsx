import { useState, useRef, useEffect } from 'react'
import {
  Send,
  X,
  Paperclip,
  Mic,
  Bot,
  User,
  HelpCircle,
  Bell,
  UserCircle,
  ChevronDown,
  FileText,
  Search,
  Headphones,
  Plus,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { onboardingAPI, QuickReply } from '../services/onboardingAPI'
import hBlackLogo from '../assets/images/h-black-logo.jpeg'
import Spinner from './ui/Spinner'
import Button from './ui/Button'
import Modal from './ui/Modal'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  quickReplies?: QuickReply[]
}

interface Document {
  id: string
  name: string
  status: 'uploaded' | 'missing_info' | 'processing'
}

export default function ChatWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [_isOnboarding, setIsOnboarding] = useState(false)
  const [documents] = useState<Document[]>([
    { id: '1', name: 'Receipt_Jan2024.pdf', status: 'uploaded' },
    { id: '2', name: 'Invoice_ClientA.png', status: 'missing_info' },
    { id: '3', name: 'Bank_Statement_Feb.pdf', status: 'uploaded' },
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Generate a unique user identifier for web (using localStorage)
  const getUserIdentifier = (): string => {
    let identifier = localStorage.getItem('kamafile_user_id')
    if (!identifier) {
      identifier = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('kamafile_user_id', identifier)
    }
    return identifier
  }

  // Start onboarding when modal opens
  useEffect(() => {
    if (open && !sessionId && messages.length === 0) {
      startOnboarding()
    }
  }, [open])

  const startOnboarding = async () => {
    setIsLoading(true)
    setIsOnboarding(true)
    try {
      const userIdentifier = getUserIdentifier()
      const response = await onboardingAPI.startOnboarding({
        channel: 'web',
        user_identifier: userIdentifier,
      })

      setSessionId(response.session_id)
      setCurrentStep(response.step || null)

      const botMessage: Message = {
        id: Date.now().toString(),
        text: response.message,
        sender: 'bot',
        timestamp: new Date(),
        quickReplies: response.quick_replies || undefined,
      }

      setMessages([botMessage])
    } catch (error) {
      console.error('Failed to start onboarding:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "Sorry, I'm having trouble starting. Please try again.",
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages([errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickReply = async (payload: string, title: string) => {
    if (!sessionId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: title,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await onboardingAPI.processStep({
        session_id: sessionId,
        step: currentStep || '',
        response: payload,
      })

      setCurrentStep(response.step || null)
      setIsOnboarding(!response.completed && response.status === 'onboarding')

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.message,
        sender: 'bot',
        timestamp: new Date(),
        quickReplies: response.quick_replies || undefined,
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      console.error('Failed to process step:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble processing that. Please try again.",
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async () => {
    if (!inputValue.trim()) return

    if (!sessionId) {
      await startOnboarding()
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const userInput = inputValue
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await onboardingAPI.processStep({
        session_id: sessionId,
        step: currentStep || '',
        response: userInput,
      })

      setCurrentStep(response.step || null)
      setIsOnboarding(!response.completed && response.status === 'onboarding')

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.message,
        sender: 'bot',
        timestamp: new Date(),
        quickReplies: response.quick_replies || undefined,
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      console.error('Failed to process message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble processing that. Please try again.",
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'bg-green-100 text-green-700'
      case 'missing_info':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'missing_info':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="xl" className="!max-w-6xl h-[90vh]">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img src={hBlackLogo} alt="Kamafile" className="h-8 w-auto" />
            <h2 className="text-xl font-semibold">Kamafile</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-600 hover:text-gray-900">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900 flex items-center gap-1">
              <UserCircle className="w-5 h-5" />
              <ChevronDown className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 text-gray-600 hover:text-gray-900">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel: Chat */}
          <div className="flex-1 flex flex-col bg-gray-50 border-r border-gray-200">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {messages.length === 0 && isLoading && (
                <div className="flex justify-center p-4">
                  <Spinner size="md" />
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender === 'bot' && (
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#4caf50' }}
                    >
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="max-w-[70%] flex flex-col gap-1">
                    <div
                      className={`p-4 rounded-lg shadow-sm ${
                        message.sender === 'user'
                          ? 'text-white'
                          : 'bg-white text-gray-900'
                      }`}
                      style={message.sender === 'user' ? { backgroundColor: '#4caf50' } : {}}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
                      {message.sender === 'user' && (
                        <CheckCircle className="w-3.5 h-3.5 text-white ml-2 mt-1 inline-block" />
                      )}
                    </div>

                    {/* Quick Reply Buttons */}
                    {message.sender === 'bot' && message.quickReplies && message.quickReplies.length > 0 && (
                      <div className="flex flex-col gap-2 mt-1">
                        {message.quickReplies.map((reply) => (
                          <Button
                            key={reply.payload}
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickReply(reply.payload, reply.title)}
                            disabled={isLoading}
                            className="text-left justify-start"
                          >
                            {reply.title}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.sender === 'user' && (
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#2d3a4f' }}
                    >
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && messages.length > 0 && (
                <div className="flex justify-start gap-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#4caf50' }}
                  >
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <Spinner size="sm" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2 items-end">
                <button className="p-2 text-gray-600 hover:text-gray-900">
                  <Paperclip className="w-5 h-5" />
                </button>
                <textarea
                  placeholder="Type a message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none bg-gray-50 disabled:opacity-50"
                  style={{ maxHeight: '100px', minHeight: '40px' }}
                />
                <button className="p-2 text-gray-600 hover:text-gray-900">
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className="w-10 h-10 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
                  style={{ backgroundColor: '#4caf50' }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = '#388e3c'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = '#4caf50'
                    }
                  }}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Sidebar */}
          <div className="w-80 bg-gray-50 flex flex-col p-4 gap-6 overflow-y-auto">
            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  fullWidth
                  className="justify-start"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Documents
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  className="justify-start"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Check Readiness
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  className="justify-start"
                >
                  <Headphones className="w-4 h-4 mr-2" />
                  Get Expert Help
                </Button>
              </div>
            </div>

            {/* My Documents */}
            <div>
              <h3 className="text-sm font-semibold mb-3">My Documents</h3>
              <div className="space-y-0">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="py-3 border-b border-gray-200 flex items-start gap-3"
                  >
                    <FileText className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(doc.status)}
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(doc.status)}`}>
                          {doc.status === 'uploaded'
                            ? 'Uploaded'
                            : doc.status === 'missing_info'
                            ? 'Missing Info'
                            : 'Processing'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Files Button */}
            <Button
              variant="secondary"
              fullWidth
              className="flex items-center justify-center gap-2 py-3"
            >
              <Plus className="w-4 h-4" />
              Upload Files
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
