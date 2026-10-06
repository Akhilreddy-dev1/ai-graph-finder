import React, { useState, useRef, useEffect } from 'react'
import { Send, Terminal, Trash2, Copy, Check, ChevronRight, StopCircle, RefreshCw } from 'lucide-react'
import { chatWithAI, clientSideAnalyzeGraph } from '../api'

export default function AIAssistant({ graphData, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `### 🤖 AI Graph Analytics Engine\nReady to analyze coordinates, instantaneous derivatives, slopes ($m = dy/dx$), spatial vectors, or regression models for **${graphData?.label || 'Active Dataset'}**.\n\nType your question below or click one of the rapid command shortcuts.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState(null)
  const [errorStatus, setErrorStatus] = useState(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const abortControllerRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setLoading(false)
  }

  const sendMessage = async (textToSend) => {
    const text = (textToSend || input).trim()
    if (!text || loading) return

    setErrorStatus(null)
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMessage = { role: 'user', content: text, timestamp }
    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    if (!textToSend) setInput('')
    setLoading(true)

    // Setup abort controller
    abortControllerRef.current = new AbortController()

    try {
      const response = await chatWithAI(text, graphData)
      const replyContent = response?.reply || clientSideAnalyzeGraph(graphData, text)
      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: replyContent,
          engine: response?.engine || 'analytical_engine',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } catch (err) {
      // Immediate fallback to local math engine ensures chat is never broken
      const fallbackContent = clientSideAnalyzeGraph(graphData, text)
      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: fallbackContent || `Calculation error: ${err.message || 'Unable to compute graph analytics.'}`,
          engine: 'client_math_engine',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      setErrorStatus('Handled via local mathematics fallback engine.')
    } finally {
      setLoading(false)
      abortControllerRef.current = null
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleCopy = (content, idx) => {
    navigator.clipboard.writeText(content)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const commands = [
    { cmd: 'slope', label: 'Derivative & Slope (m)', prompt: 'Calculate the instantaneous slope (m) at each point and overall rate of change.' },
    { cmd: 'trend', label: 'Trend & Regression', prompt: 'What is the overall trend, rate of change, and R² value for this graph?' },
    { cmd: 'extrema', label: 'Min / Max Extrema', prompt: 'Identify the exact peak maximum and trough minimum coordinates.' },
    { cmd: 'equation', label: 'Regression Formula', prompt: 'Calculate the mathematical regression model equation (y = mx + b).' },
    { cmd: 'forecast', label: 'Project Extrapolations', prompt: 'Forecast the next 3 future data points based on current slope.' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden text-[var(--text-pri)] bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--border)] bg-[#161b22]/85">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="text-xs font-semibold tracking-wide uppercase text-[var(--text-sec)]">
            AI Analytics & Math Engine
          </span>
          <span className="mono text-[10px] text-[var(--text-muted)] truncate max-w-[140px]">
            [{graphData?.label || 'Dataset'}]
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() =>
              setMessages([
                {
                  role: 'assistant',
                  content: `Context reset for **${graphData?.label || 'Active Graph'}**. Ask any question or command below.`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ])
            }
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-pri)] hover:bg-[#30363d]/60 transition-colors"
            title="Clear history"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Command Bar */}
      <div className="px-3 py-1.5 border-b border-[var(--border)] flex gap-1.5 overflow-x-auto bg-[#0d1117]/60">
        {commands.map((c) => (
          <button
            key={c.cmd}
            onClick={() => sendMessage(c.prompt)}
            disabled={loading}
            className="mono flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#21262d] border border-[#30363d] text-[var(--text-sec)] hover:text-[var(--text-pri)] hover:border-[var(--accent)] transition-colors shrink-0 disabled:opacity-50"
            title={c.prompt}
          >
            <span className="text-[var(--accent)] font-bold">$</span>
            {c.cmd}
          </button>
        ))}
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <span className="mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                {m.role === 'user' ? 'QUERY' : 'ENGINE'}
              </span>
              {m.timestamp && (
                <span className="mono text-[9px] text-[#484f58]">
                  • {m.timestamp}
                </span>
              )}
            </div>
            <div
              className={`relative group max-w-[92%] rounded-md p-3 text-xs leading-relaxed border transition-all ${
                m.role === 'user'
                  ? 'bg-[#1f242c] border-[#388bfd]/50 text-[#f0f6fc]'
                  : 'bg-[#161b22] border-[#30363d] text-[#c9d1d9]'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans space-y-1.5">
                {m.content}
              </div>

              {m.role === 'assistant' && (
                <button
                  onClick={() => handleCopy(m.content, idx)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-[#21262d] border border-[#30363d] text-[var(--text-muted)] hover:text-[var(--text-pri)]"
                  title="Copy result"
                >
                  {copiedIdx === idx ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center justify-between px-3 py-2 rounded bg-[#161b22]/70 border border-[#30363d] text-xs text-[var(--text-muted)] mono">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3 h-3 animate-spin text-[var(--accent)]" />
              <span>Evaluating analytical derivatives & graph model...</span>
            </div>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors"
            >
              <StopCircle className="w-3 h-3" />
              Stop
            </button>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Error / Status Bar */}
      {errorStatus && (
        <div className="px-3 py-1 bg-[#1c1917] border-t border-[#44403c] text-[10px] text-amber-400 mono">
          {errorStatus}
        </div>
      )}

      {/* Command Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage()
        }}
        className="p-2.5 border-t border-[var(--border)] bg-[#161b22]/90 flex gap-2"
      >
        <div className="flex-1 flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1.5 focus-within:border-[var(--accent)] transition-colors">
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about trend, equation, or slope at point (e.g. 'slope at node 2')..."
            className="mono flex-1 bg-transparent text-xs text-[var(--text-pri)] placeholder-[var(--text-muted)] outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="mono px-3.5 py-1.5 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Send className="w-3 h-3" />
          <span>EXEC</span>
        </button>
      </form>
    </div>
  )
}
