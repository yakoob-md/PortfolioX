'use client'

import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, ChevronRight, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { useFundStore } from '@/lib/store'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  suggestions?: string[]
  timestamp: Date
}

const SUGGESTED_QUESTIONS = [
  'Which of my funds are Regular plans?',
  'Calculate my lifetime savings from switching',
  'Tell me about SBI Bluechip Fund',
  'What is my portfolio diversification score?',
  'How will Budget 2024 affect my taxes?',
]

export default function AICopilot() {
  const { holdings, sessionId: storeSessionId } = useFundStore()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasShownGreetingRef = useRef(false)

  const dynamicSuggestions = (() => {
    if (holdings.length === 0) return [
      'How do I build a diversified portfolio?',
      'Best tax-saving strategy (ELSS)?',
      'What is the difference between Direct and Regular?',
    ]
    
    const hasRegular = holdings.some(h => h.planType === 'regular')
    const suggestions = []
    
    if (hasRegular) {
      suggestions.push('Calculate my savings if I switch all regular plans')
      suggestions.push('Which of my funds are charging commissions?')
    }
    
    suggestions.push('Analyze my portfolio diversification')
    suggestions.push('Show me my top fund performance')
    suggestions.push('Explain Budget 2024 tax on my holdings')
    
    return suggestions.slice(0, 5)
  })()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Personalized Greeting
  useEffect(() => {
    if (isOpen && messages.length === 0 && holdings.length > 0 && !hasShownGreetingRef.current) {
      const regularCount = holdings.filter(h => h.planType === 'regular').length
      const greeting = `Hello! I see you have **${holdings.length} funds** in your portfolio. 
      
${regularCount > 0 
  ? `⚠️ I've detected **${regularCount} Regular plans** that are leaking wealth through commissions. Would you like me to analyze the savings if you switch to Direct plans?` 
  : '✅ Great job! Your entire portfolio is in Direct plans. How can I help you optimize further today?'}
      
I'm ready to dive into your specific holdings—just ask!`
      
      hasShownGreetingRef.current = true
      queueMicrotask(() => {
        setMessages((prev) => prev.length === 0 ? [{
        id: 'greeting',
        role: 'assistant',
        content: greeting,
        timestamp: new Date()
        }] : prev)
      })
    }
  }, [isOpen, messages.length, holdings])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    // Create a temporary assistant message
    const assistantId = `assistant-${Date.now()}`
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, assistantMsg])

    try {
      const res = await fetch("/ai/chat", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          sessionId: storeSessionId,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) throw new Error('AI service error')
      
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream available')

      const decoder = new TextDecoder()
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        // Split by newline to handle multiple JSON objects in one chunk
        const lines = chunk.split('\n')

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          
          try {
              const data = JSON.parse(trimmed)
            if (data.content) {
              accumulatedContent += data.content
              
              // Parse suggestions if present
              let cleanContent = accumulatedContent
              let suggestions: string[] = []
              
              const suggestionMatch = accumulatedContent.match(/\[SUGGESTIONS\]([\s\S]*?)\[\/SUGGESTIONS\]/)
              if (suggestionMatch) {
                cleanContent = accumulatedContent.replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/, '').trim()
                suggestions = suggestionMatch[1].split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('- '))
              }

              setMessages((prev) => 
                prev.map(m => m.id === assistantId ? { ...m, content: cleanContent, suggestions } : m)
              )
            }
          } catch (e) {
            console.warn('JSON chunk parse error (retrying):', e, trimmed)
          }
        }
      }
    } catch (err) {
      console.error('Streaming error:', err)
      setMessages((prev) => 
        prev.map(m => m.id === assistantId ? { ...m, content: 'Bhai, network mein issue hai. Please try again?' } : m)
      )
      toast.error('Connection error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, storeSessionId])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('Copied to clipboard')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-8 right-8 z-50 h-16 w-16 rounded-3xl bg-emerald-600 shadow-2xl shadow-emerald-500/40 flex items-center justify-center border border-white/20 group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
            <MessageCircle className="h-7 w-7 text-white relative z-10" />
            <div className="absolute -right-1 -top-1 h-4 w-4 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-8 right-8 z-50 w-[440px] max-w-[calc(100vw-2rem)] h-[680px] max-h-[calc(100vh-4rem)] flex flex-col rounded-[2rem] bg-background border border-border/50 shadow-3xl overflow-hidden shadow-emerald-500/10"
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold leading-tight">PortfolioX Intelligence</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span className="text-[10px] text-emerald-100 font-medium uppercase tracking-wider">System Operational</span>
                  </div>
                </div>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/10 rounded-lg"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/30">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12">
                  <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center">
                    <Sparkles className="h-10 w-10 text-emerald-600/50" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-foreground">Your Financial Intelligence</h4>
                    <p className="text-sm text-muted-foreground max-w-[280px]">
                      Ask about your specific holdings, tax implications, or Direct plan savings.
                    </p>
                  </div>
                  <div className="w-full space-y-2 pt-4">
                    {dynamicSuggestions.map((q, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs h-auto py-3 px-4 rounded-xl border-emerald-500/20 hover:bg-emerald-500/5 hover:border-emerald-500/40 text-left"
                        onClick={() => sendMessage(q)}
                      >
                        <ChevronRight className="h-3 w-3 mr-2 text-emerald-600" />
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-emerald-600/20">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div className="group relative max-w-[85%]">
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-emerald-600 text-white rounded-tr-none' 
                          : 'bg-card border border-border text-foreground rounded-tl-none shadow-sm'
                      }`}>
                        {msg.role === 'assistant' && !msg.content ? (
                          <div className="flex gap-1.5 py-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        ) : (
                          <div className="markdown-content prose-sm prose-emerald dark:prose-invert">
                            <ReactMarkdown>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                      {msg.role === 'assistant' && msg.content && (
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="absolute -right-8 top-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-emerald-600"
                        >
                          {copiedId === msg.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {/* Follow-up Suggestions */}
              {!isLoading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap gap-2 pt-2 px-1"
                >
                  <p className="w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 ml-1">Follow-up Questions</p>
                  {(messages[messages.length - 1].suggestions?.length ? messages[messages.length - 1].suggestions : dynamicSuggestions).map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-[11px] h-8 px-3 rounded-full border-emerald-500/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-muted-foreground hover:text-emerald-700 transition-all"
                      onClick={() => sendMessage(q as string)}
                    >
                      {q}
                    </Button>
                  ))}
                </motion.div>
              )}

              {isLoading && (messages.length === 0 || messages[messages.length - 1]?.role !== 'assistant') && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center animate-pulse">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-tl-none p-4 flex gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-border bg-background">
              <div className="relative">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your co-pilot..."
                  className="h-14 pl-5 pr-14 rounded-2xl border-border/50 focus:border-emerald-500/50 focus:ring-emerald-500/10"
                  disabled={isLoading}
                />
                <Button
                  size="icon"
                  className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  disabled={!input.trim() || isLoading}
                  onClick={() => sendMessage(input)}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-[10px] text-center mt-3 text-muted-foreground/60 font-medium">
                Mutual fund investments are subject to market risks.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
