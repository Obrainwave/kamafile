import { useState, useRef, useEffect } from 'react'
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Dialog,
  DialogContent,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
} from '@mui/material'
import {
  Send as SendIcon,
  Close as CloseIcon,
  AttachFile as AttachFileIcon,
  Mic as MicIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  HelpOutline as HelpIcon,
  NotificationsNone as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Description as DocumentIcon,
  Search as SearchIcon,
  HeadsetMic as HeadsetIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material'
import { onboardingAPI, QuickReply } from '../services/onboardingAPI'
import hBlackLogo from '../assets/images/h-black-logo.jpeg'

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
        return 'success'
      case 'missing_info':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
      case 'missing_info':
        return <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
      default:
        return null
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh',
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component="img"
              src={hBlackLogo}
              alt="Kamafile"
              sx={{ height: 32, width: 'auto' }}
            />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Kamafile
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small">
              <HelpIcon />
            </IconButton>
            <IconButton size="small">
              <NotificationsIcon />
            </IconButton>
            <IconButton size="small">
              <AccountCircleIcon />
              <ArrowDownIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Main Content Area */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Panel: Chat */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.default',
              borderRight: '1px solid',
              borderColor: 'divider',
            }}
          >
            {/* Messages Area */}
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                p: 3,
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
                      }}
                    >
                      <BotIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                  )}
                  <Box
                    sx={{
                      maxWidth: '70%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: message.sender === 'user' ? 'secondary.main' : 'background.paper',
                        color: message.sender === 'user' ? 'white' : 'text.primary',
                        p: 2,
                        borderRadius: 2,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        wordWrap: 'break-word',
                      }}
                    >
                      <Typography variant="body2" sx={{ lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                        {message.text}
                      </Typography>
                      {message.sender === 'user' && (
                        <CheckCircleIcon sx={{ fontSize: 14, color: 'white', ml: 1, mt: 0.5 }} />
                      )}
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
                  </Box>
                  {message.sender === 'user' && (
                    <Avatar
                      sx={{
                        bgcolor: 'primary.light',
                        width: 32,
                        height: 32,
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

            {/* Input Area */}
            <Box
              sx={{
                p: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  <AttachFileIcon />
                </IconButton>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Type a message..."
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
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  <MicIcon />
                </IconButton>
                <IconButton
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  sx={{
                    bgcolor: 'secondary.main',
                    color: 'white',
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
            </Box>
          </Box>

          {/* Right Panel: Sidebar */}
          <Box
            sx={{
              width: 320,
              bgcolor: 'background.default',
              display: 'flex',
              flexDirection: 'column',
              p: 2,
              gap: 3,
              overflowY: 'auto',
            }}
          >
            {/* Quick Actions */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                Quick Actions
              </Typography>
              <Stack spacing={1}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<DocumentIcon />}
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    borderColor: 'divider',
                    color: 'text.primary',
                  }}
                >
                  View Documents
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<SearchIcon />}
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    borderColor: 'divider',
                    color: 'text.primary',
                  }}
                >
                  Check Readiness
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<HeadsetIcon />}
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    borderColor: 'divider',
                    color: 'text.primary',
                  }}
                >
                  Get Expert Help
                </Button>
              </Stack>
            </Box>

            {/* My Documents */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                My Documents
              </Typography>
              <List sx={{ p: 0 }}>
                {documents.map((doc) => (
                  <ListItem
                    key={doc.id}
                    sx={{
                      px: 0,
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <DocumentIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {doc.name}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          {getStatusIcon(doc.status)}
                          <Chip
                            label={
                              doc.status === 'uploaded'
                                ? 'Uploaded'
                                : doc.status === 'missing_info'
                                ? 'Missing Info'
                                : 'Processing'
                            }
                            size="small"
                            color={getStatusColor(doc.status) as any}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Upload Files Button */}
            <Button
              variant="contained"
              fullWidth
              startIcon={<AddIcon />}
              sx={{
                bgcolor: 'secondary.main',
                color: 'white',
                textTransform: 'none',
                py: 1.5,
                '&:hover': {
                  bgcolor: 'secondary.dark',
                },
              }}
            >
              Upload Files
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
