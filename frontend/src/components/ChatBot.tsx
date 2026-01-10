import { useState, useRef, useEffect } from 'react'
import { Send, X, MessageCircle, Bot, User, FileText } from 'lucide-react'
import { onboardingAPI, QuickReply } from '../services/onboardingAPI'
import { ragAPI, Citation } from '../services/ragAPI'
import Spinner from './ui/Spinner'
import Button from './ui/Button'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  quickReplies?: QuickReply[]
  citations?: Citation[]
}

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isOnboarding, setIsOnboarding] = useState(false)
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

  // Start onboarding when chat opens
  useEffect(() => {
    if (open && !sessionId && messages.length === 0) {
      startOnboarding()
    }
  }, [open])

  // Listen for custom event to open chat from other components
  useEffect(() => {
    const handleOpenChat = () => {
      setOpen(true)
    }

    window.addEventListener('openChatWidget', handleOpenChat)
    return () => {
      window.removeEventListener('openChatWidget', handleOpenChat)
    }
  }, [])

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

    // Add user message first
    const userMessage: Message = {
      id: Date.now().toString(),
      text: title,
      sender: 'user',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // If quick reply contains tax keywords, treat it as a tax question and use RAG
    // This prevents onboarding loop when user wants to ask tax questions
    if (isTaxQuestion(title)) {
      // Exit onboarding immediately and use RAG
      setIsOnboarding(false)
      
      try {
        // Get user context if available
        const userStr = localStorage.getItem('user')
        let userContext: Record<string, any> | undefined
        if (userStr) {
          try {
            const user = JSON.parse(userStr)
            userContext = {
              user_type: user.user_type,
            }
          } catch {
            // Ignore parsing errors
          }
        }

        // Use RAG for tax questions
        const ragResponse = await ragAPI.ask(title, userContext)

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: ragResponse.answer,
          sender: 'bot',
          timestamp: new Date(),
          citations: ragResponse.citations,
        }

        setMessages((prev) => [...prev, botMessage])
      } catch (ragError: any) {
        console.error('RAG query failed:', ragError)
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: "I'm having trouble accessing the tax knowledge base. Please try again or rephrase your question.",
          sender: 'bot',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
      return
    }

    // Continue with onboarding for non-tax quick replies
    try {
      const response = await onboardingAPI.processStep({
        session_id: sessionId,
        step: currentStep || '',
        response: payload,
      })

      setCurrentStep(response.step || null)
      // Mark onboarding as complete if the response indicates completion
      const stillOnboarding = !response.completed && response.status === 'onboarding'
      setIsOnboarding(stillOnboarding)

      // If onboarding is now complete, don't show quick replies anymore
      if (!stillOnboarding) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.message || "Great! I'm ready to help with your tax questions. Ask me anything!",
          sender: 'bot',
          timestamp: new Date(),
          // No quick replies after onboarding - user can now ask free-form questions
        }
        setMessages((prev) => [...prev, botMessage])
        return
      }

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

  // Check if a question is a tax-related question
  const isTaxQuestion = (question: string): boolean => {
    const taxKeywords = ['tax', 'vat', 'paye', 'wht', 'cgt', 'cit', 'petroleum', 'stamp', 
                         'duty', 'customs', 'firs', 'federal inland revenue', 'inland revenue',
                         'section', 'act', 'law', 'regulation', 'compliance', 'filing', 
                         'return', 'assessment', 'penalty', 'fine', 'taxable', 'exempt',
                         'deduction', 'allowance', 'relief', 'taxable income', 'tax rate']
    const lowerQuestion = question.toLowerCase()
    return taxKeywords.some(keyword => lowerQuestion.includes(keyword))
  }

  const handleSend = async () => {
    if (!inputValue.trim()) return

    if (!sessionId) {
      // If no session, start onboarding
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
      // PRIORITY 1: Always use RAG for tax-related questions (even during onboarding)
      if (isTaxQuestion(userInput)) {
        try {
          // Get user context if available
          const userStr = localStorage.getItem('user')
          let userContext: Record<string, any> | undefined
          if (userStr) {
            try {
              const user = JSON.parse(userStr)
              userContext = {
                user_type: user.user_type,
              }
            } catch {
              // Ignore parsing errors
            }
          }

          // Use RAG for tax questions
          const ragResponse = await ragAPI.ask(userInput, userContext)

          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: ragResponse.answer,
            sender: 'bot',
            timestamp: new Date(),
            citations: ragResponse.citations,
          }

          setMessages((prev) => [...prev, botMessage])
          
          // Mark onboarding as complete if we were in onboarding - user asked a tax question
          if (isOnboarding) {
            setIsOnboarding(false)
          }
        } catch (ragError: any) {
          console.error('RAG query failed:', ragError)
          // If RAG fails, show error and optionally fall back to onboarding only for non-tax questions
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: "I'm having trouble accessing the tax knowledge base. Please try again or rephrase your question.",
            sender: 'bot',
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, errorMessage])
        }
      } 
      // PRIORITY 2: If onboarding is complete, always use RAG (even for non-tax questions)
      else if (!isOnboarding) {
        try {
          // Get user context if available
          const userStr = localStorage.getItem('user')
          let userContext: Record<string, any> | undefined
          if (userStr) {
            try {
              const user = JSON.parse(userStr)
              userContext = {
                user_type: user.user_type,
              }
            } catch {
              // Ignore parsing errors
            }
          }

          // Use RAG even for general questions after onboarding
          const ragResponse = await ragAPI.ask(userInput, userContext)

          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: ragResponse.answer,
            sender: 'bot',
            timestamp: new Date(),
            citations: ragResponse.citations,
          }

          setMessages((prev) => [...prev, botMessage])
        } catch (ragError: any) {
          console.error('RAG query failed:', ragError)
          // If RAG fails, show error message
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: "I'm having trouble accessing the tax knowledge base. Please try again or rephrase your question.",
            sender: 'bot',
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, errorMessage])
        }
      }
      // PRIORITY 3: Continue with onboarding only for non-tax questions during onboarding
      else {
        // Continue with onboarding for non-tax questions during onboarding
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
      }
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 text-white rounded-full shadow-lg hover:scale-105 transition-all flex items-center justify-center"
          style={{ backgroundColor: '#4caf50' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#388e3c'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#4caf50'
          }}
        >
          <MessageCircle className="w-7 h-7" />
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-full sm:w-96 max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-3rem)] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="text-white p-4 flex items-center justify-between" style={{ backgroundColor: '#1a2332' }}>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#4caf50' }}
              >
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Tax Assistant</h3>
                <p className="text-xs opacity-90">
                  {isOnboarding ? 'Onboarding...' : 'Online'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-white hover:bg-white/10 rounded transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-4">
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
                <div className="max-w-[75%] flex flex-col gap-1">
                  <div
                    className={`p-3 rounded-lg shadow-sm ${
                      message.sender === 'user'
                        ? 'text-white'
                        : 'bg-white text-gray-900'
                    }`}
                    style={message.sender === 'user' ? { backgroundColor: '#1a2332' } : {}}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
                    
                    {/* Citations */}
                    {message.sender === 'bot' && message.citations && message.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <div className="flex items-start gap-2 text-xs">
                          <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-600" />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-700 mb-1.5">Legal Sources:</div>
                            <div className="space-y-1">
                              {message.citations.map((citation, index) => (
                                <div key={index} className="text-gray-600 leading-relaxed">
                                  <span className="font-medium">{index + 1}.</span> {citation.law_name}
                                  {citation.section_number && <span className="text-gray-500">, Section {citation.section_number}</span>}
                                  {citation.year && <span className="text-gray-500"> ({citation.year})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
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

                  <p className={`text-xs text-gray-500 px-1 ${
                    message.sender === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
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

          <div className="border-t border-gray-200"></div>

          {/* Input Area */}
          <div className="p-4 bg-white flex gap-2 items-end">
            <textarea
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              rows={1}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none bg-gray-50 disabled:opacity-50"
              style={{ maxHeight: '100px', minHeight: '40px' }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="w-10 h-10 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center flex-shrink-0"
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
      )}
    </>
  )
}
