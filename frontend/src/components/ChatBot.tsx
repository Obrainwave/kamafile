import { useState, useRef, useEffect } from 'react'
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Fade,
  Slide,
  Divider,
  Button,
  CircularProgress,
} from '@mui/material'
import {
  Send as SendIcon,
  Close as CloseIcon,
  Chat as ChatIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import { onboardingAPI, QuickReply } from '../services/onboardingAPI'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  quickReplies?: QuickReply[]
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

    // Add user message
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
      // Use currentStep if available, otherwise use empty string for active status
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      {/* Floating Chat Button */}
      <Fade in={!open}>
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1400,
            display: open ? 'none' : 'block',
          }}
        >
          <IconButton
            onClick={() => setOpen(true)}
            sx={{
              bgcolor: 'secondary.main',
              color: 'white',
              width: 64,
              height: 64,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              '&:hover': {
                bgcolor: 'secondary.dark',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s',
            }}
          >
            <ChatIcon sx={{ fontSize: 28 }} />
          </IconButton>
        </Box>
      </Fade>

      {/* Chat Window */}
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: { xs: 'calc(100vw - 48px)', sm: 400 },
            maxWidth: 400,
            height: 600,
            maxHeight: { xs: 'calc(100vh - 48px)', sm: 600 },
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1400,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  bgcolor: 'secondary.main',
                  width: 40,
                  height: 40,
                }}
              >
                <BotIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Tax Assistant
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                  {isOnboarding ? 'Onboarding...' : 'Online'}
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={() => setOpen(false)}
              size="small"
              sx={{
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Messages Area */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              bgcolor: 'background.default',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {messages.length === 0 && isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}

            {messages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  gap: 1,
                }}
              >
                {message.sender === 'bot' && (
                  <Avatar
                    sx={{
                      bgcolor: 'secondary.main',
                      width: 32,
                      height: 32,
                      order: 0,
                    }}
                  >
                    <BotIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                )}
                <Box
                  sx={{
                    maxWidth: '75%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: message.sender === 'user' ? 'primary.main' : 'background.paper',
                      color: message.sender === 'user' ? 'white' : 'text.primary',
                      p: 1.5,
                      borderRadius: 2,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      wordWrap: 'break-word',
                    }}
                  >
                    <Typography variant="body2" sx={{ lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                      {message.text}
                    </Typography>
                  </Box>

                  {/* Quick Reply Buttons */}
                  {message.sender === 'bot' && message.quickReplies && message.quickReplies.length > 0 && (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        mt: 0.5,
                      }}
                    >
                      {message.quickReplies.map((reply) => (
                        <Button
                          key={reply.payload}
                          variant="outlined"
                          size="small"
                          onClick={() => handleQuickReply(reply.payload, reply.title)}
                          disabled={isLoading}
                          sx={{
                            textTransform: 'none',
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            '&:hover': {
                              bgcolor: 'primary.light',
                              color: 'white',
                              borderColor: 'primary.light',
                            },
                          }}
                        >
                          {reply.title}
                        </Button>
                      ))}
                    </Box>
                  )}

                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.7rem',
                      px: 1,
                      alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {formatTime(message.timestamp)}
                  </Typography>
                </Box>
                {message.sender === 'user' && (
                  <Avatar
                    sx={{
                      bgcolor: 'primary.light',
                      width: 32,
                      height: 32,
                      order: 1,
                    }}
                  >
                    <PersonIcon sx={{ fontSize: 18, color: 'white' }} />
                  </Avatar>
                )}
              </Box>
            ))}

            {isLoading && messages.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 1 }}>
                <Avatar
                  sx={{
                    bgcolor: 'secondary.main',
                    width: 32,
                    height: 32,
                  }}
                >
                  <BotIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box
                  sx={{
                    bgcolor: 'background.paper',
                    p: 1.5,
                    borderRadius: 2,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  }}
                >
                  <CircularProgress size={16} />
                </Box>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Box>

          <Divider />

          {/* Input Area */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              display: 'flex',
              gap: 1,
              alignItems: 'flex-end',
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              variant="outlined"
              size="small"
              disabled={isLoading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: 'background.default',
                },
              }}
            />
            <IconButton
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              sx={{
                bgcolor: 'secondary.main',
                color: 'white',
                width: 40,
                height: 40,
                '&:hover': {
                  bgcolor: 'secondary.dark',
                },
                '&:disabled': {
                  bgcolor: 'action.disabledBackground',
                  color: 'action.disabled',
                },
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      </Slide>
    </>
  )
}
