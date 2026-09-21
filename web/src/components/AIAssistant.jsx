import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Trash2, Copy, Check, TrendingUp, Compass, Cpu } from 'lucide-react'
import { chatWithAI, clientSideAnalyzeGraph } from '../api'

export default function AIAssistant({ graphData }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I'm your **AI Graph & Math Assistant** with built-in analytics.\n\nI can help you understand trends, find mathematical equations, locate peaks and minimums, or extrapolate future points.\n\nAsk me anything or click one of the quick suggestions below!`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (textToSend) => {
    const text = textToSend || input
    if (!text.trim() || loading) return

    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    if (!textToSend) setInput('')
    setLoading(true)

    try {
      const response = await chatWithAI(text, graphData)
      const replyText = response?.reply || clientSideAnalyzeGraph(graphData, text)
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: replyText,
          engine: response?.engine || 'built_in_math_ai',
        },
      ])
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: clientSideAnalyzeGraph(graphData, text),
          engine: 'built_in_math_ai',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (content, idx) => {
    navigator.clipboard.writeText(content)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const quickPrompts = [
    { label: '📈 Overall Trend & Slope', text: 'What is the overall trend and rate of change?' },
    { label: '🔝 Peak & Low Points', text: 'Find the maximum and minimum coordinates.' },
    { label: '📐 Mathematical Equation', text: 'What is the regression equation for this graph?' },
    { label: '🔮 Predict Next Points', text: 'Predict the next 3 subsequent data points.' },
    { label: '📊 Complete Summary', text: 'Give me a comprehensive analytical summary of this data.' },
  ]

  return (
    <div className="flex flex-col h-[74vh] glass-card rounded-2xl overflow-hidden border border-indigo-500/20 shadow-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/60 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              AI Math & Graph Assistant
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-2.5 h-2.5" />
                Built-in AI
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Active Context: <span className="text-indigo-300 font-medium">{graphData?.label || 'Default Graph'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                role: 'assistant',
                content: `Chat history cleared. How can I assist with **${graphData?.label || 'your graph'}**?`,
              },
            ])
          }
          className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompts strip */}
      <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex gap-2 overflow-x-auto text-xs">
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => sendMessage(p.text)}
            disabled={loading}
            className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-indigo-600/30 hover:border-indigo-500/40 border border-slate-700/60 text-slate-300 hover:text-white transition-all text-[11px] disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Message history */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`relative group max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-md'
                  : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-none shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{m.content}</div>

              {m.role === 'assistant' && (
                <button
                  onClick={() => handleCopy(m.content, idx)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded border border-slate-700"
                  title="Copy message"
                >
                  {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>

            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
              </div>
              <span className="text-[11px] text-slate-400">Computing mathematical analysis...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage()
        }}
        className="p-3 bg-slate-900/80 border-t border-slate-800 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your graph, trend, equation, or points..."
          className="flex-1 bg-[#060a14] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" />
          Send
        </button>
      </form>
    </div>
  )
}
