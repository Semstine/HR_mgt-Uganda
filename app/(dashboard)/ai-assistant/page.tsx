'use client'

import { useState } from 'react'
import Header from '@/components/layout/header'
import { MessageSquare, Sparkles, Loader2, Send, User, Bot } from 'lucide-react'

const SUGGESTED_QUERIES = [
  'Show me all shortlisted candidates',
  'Which employees are due for performance review?',
  'How many open positions do we have?',
  'Who was hired in the last 30 days?',
  'Generate interview questions for a Finance Manager',
  'What is our current headcount by department?',
  'Which candidates have not been screened yet?',
  'Summarize onboarding status for all new employees',
]

type Message = { role: 'user' | 'assistant'; content: string; suggestions?: string[] }

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm TalentBridge AI, your HR assistant. I can help you query candidate data, check employee records, generate documents, and provide HR insights. What would you like to know?",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendMessage(question: string = input.trim()) {
    if (!question || loading) return
    const userMsg: Message = { role: 'user', content: question }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      setMessages((m) => [...m, {
        role: 'assistant',
        content: data.answer || 'I was unable to find an answer. Please try rephrasing your question.',
        suggestions: data.suggestions,
      }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Something went wrong. Please check your AI configuration and try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex-1 flex flex-col">
      <Header title="AI Assistant" subtitle="Ask questions about your HR data" />
      <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full">
        {/* Suggested queries */}
        {messages.length === 1 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> Suggested queries
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SUGGESTED_QUERIES.map((q) => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="text-left px-4 py-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto mb-4 min-h-[300px]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-100'}`}>
                {msg.role === 'user'
                  ? <User className="w-4 h-4 text-white" />
                  : <Bot className="w-4 h-4 text-purple-600" />}
              </div>
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.suggestions.map((s) => (
                      <button key={s} onClick={() => sendMessage(s)}
                        className="px-3 py-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-600" />
              </div>
              <div className="px-4 py-3 bg-white border border-gray-200 rounded-2xl rounded-tl-sm">
                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="card p-3 flex gap-3 items-end sticky bottom-6">
          <textarea
            className="flex-1 text-sm border-none outline-none resize-none bg-transparent placeholder-gray-400 min-h-[40px] max-h-[120px]"
            placeholder="Ask about candidates, employees, performance, or request AI assistance…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
            }}
            rows={1}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            className="btn-primary flex-shrink-0 p-2.5 rounded-xl">
            <Send className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-3">
          AI decisions are advisory only. Final HR decisions must be made by authorized personnel.
        </p>
      </div>
    </main>
  )
}
