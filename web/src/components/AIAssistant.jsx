
import React, { useState, useRef, useEffect } from 'react'
import { Send, Terminal, Trash2, Copy, Check, ChevronRight } from 'lucide-react'
import { chat, clientSideAnalyzeGraph } from '../api'

export default function AIAssistant({ graphData, onGraph }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Graph Analytics Engine ready. You can query statistics, regression parameters, extrema, or trend extrapolations for **${graphData?.label || 'active dataset'}**.`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState('')
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
      const response = await chat(newMessages, apiKey, JSON.stringify(graphData || {}))
      const replyText = response?.reply || clientSideAnalyzeGraph(graphData, text)
      const updatedGraph = response?.graph
      if (updatedGraph && onGraph) onGraph(updatedGraph)
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: replyText,
          graphUpdated: Boolean(updatedGraph),
        },
      ])
    } catch {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: clientSideAnalyzeGraph(graphData, text),
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

  const commands = [
    { cmd: 'slope', label: 'Find Slope' },
    { cmd: 'extrema', label: 'Min / Max Extrema' },
    { cmd: 'equation', label: 'Fit Regression' },
    { cmd: 'forecast', label: 'Project Next Points' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden text-[var(--text-pri)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--border)] bg-[#161b22]/70">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="text-xs font-semibold tracking-wide uppercase text-[var(--text-sec)]">
            Analytics Engine
          </span>
          <span className="mono text-[10px] text-[var(--text-muted)]">
            [{graphData?.label || 'Dataset'}]
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() =>
              setMessages([
                {
                  role: 'assistant',
                  content: `Context reset for **${graphData?.label || 'active graph'}**.`,
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

      <div className="px-3 py-2 border-b border-[var(--border)] bg-[#0d1117]/45">
        <input
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="Optional Groq API key — server fallback enabled"
          autoComplete="off"
          className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1.5 text-[10px] text-[var(--text-pri)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
        />
      </div>

      {/* Quick Command Bar */}
      <div className="px-3 py-1.5 border-b border-[var(--border)] flex gap-1.5 overflow-x-auto bg-[#0d1117]/50">
        {commands.map((c) => (
          <button
            key={c.cmd}
            onClick={() => sendMessage(`Run ${c.cmd} analysis on this graph.`)}
            className="mono flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#21262d] border border-[#30363d] text-[var(--text-sec)] hover:text-[var(--text-pri)] hover:border-[var(--accent)] transition-colors shrink-0"
          >
            <span className="text-[var(--accent)]">$</span>
            {c.cmd}
          </button>
        ))}
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1 mb-0.5 px-1">
              <span className="mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                {m.role === 'user' ? 'QUERY' : 'ENGINE'}
              </span>
            </div>
            <div
              className={`relative group max-w-[90%] rounded-md p-2.5 text-xs leading-relaxed border ${
                m.role === 'user'
                  ? 'bg-[#1f242c] border-[#388bfd]/40 text-[#f0f6fc]'
                  : 'bg-[#161b22] border-[#30363d] text-[#c9d1d9]'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{m.content}</div>
              {m.graphUpdated && (
                <div className="graph-updated-chip"><span>✓</span> Graph Updated</div>
              )}

              {m.role === 'assistant' && (
                <button
                  onClick={() => handleCopy(m.content, idx)}
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-[#21262d] border border-[#30363d] text-[var(--text-muted)] hover:text-[var(--text-pri)]"
                  title="Copy result"
                >
                  {copiedIdx === idx ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 px-2 text-xs text-[var(--text-muted)] mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-ping" />
            Evaluating analytical model...
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Command Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage()
        }}
        className="p-2.5 border-t border-[var(--border)] bg-[#161b22]/80 flex gap-2"
      >
        <div className="flex-1 flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] rounded px-2.5 py-1.5 focus-within:border-[var(--accent)] transition-colors">
          <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type query or command name..."
            className="mono flex-1 bg-transparent text-xs text-[var(--text-pri)] placeholder-[var(--text-muted)] outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="mono px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <Send className="w-3 h-3" />
          EXEC
        </button>
      </form>
    </div>
  )
}
