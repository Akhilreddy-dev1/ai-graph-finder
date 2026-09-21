import React, { useEffect, useMemo, useRef, useState } from 'react'
import { chat } from '../api'

const CHAT_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B · quality' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B · fast' },
  { id: 'openai/gpt-oss-20b', label: 'GPT OSS 20B · fast reasoning' },
]

export default function AssistantPanel({ apiKey, setApiKey, graph, onGraph }) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [model, setModel] = useState(CHAT_MODELS[0].id)
  const historyRef = useRef(null)
  const graphContext = useMemo(() => graph ? JSON.stringify(graph) : '', [graph])

  useEffect(() => {
    const history = historyRef.current
    if (history) history.scrollTop = history.scrollHeight
  }, [messages, busy])

  async function submit(event) {
    event.preventDefault()
    const text = question.trim()
    if (!text) return
    const nextHistory = [...messages, { role: 'user', content: text }]
    setMessages(nextHistory)
    setQuestion('')
    setError('')
    setBusy(true)
    try {
      const result = await chat(nextHistory, apiKey.trim(), graphContext, model)
      const updatedGraph = result.graph || result.tool_results?.find((item) => item.result?.graph)?.result?.graph
      if (updatedGraph && onGraph) onGraph(updatedGraph)
      setMessages((items) => [...items, {
        role: 'assistant',
        content: result.text || result.reply || 'No response.',
        graphUpdated: Boolean(updatedGraph),
      }])
    } catch (err) {
      setError(err.message || 'Assistant request failed.')
    } finally {
      setBusy(false)
    }
  }

  function clearHistory() {
    setMessages([])
    setError('')
  }

  return (
    <div className="tool-panel assistant-panel">
      <div className="assistant-intro">
        <p className="tool-description">Ask about trends, chart choices, or build relationships directly in the 3D canvas.</p>
        {messages.length > 0 && <button type="button" className="chat-clear" onClick={clearHistory}>Clear</button>}
      </div>
      <label className="tool-label" htmlFor="assistant-key">Groq API key</label>
      <input id="assistant-key" type="password" className="control-input" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Optional — server fallback enabled" autoComplete="off" />
      <label className="tool-label" htmlFor="chat-model">Assistant model</label>
      <select id="chat-model" className="control-input" value={model} onChange={(event) => setModel(event.target.value)}>
        {CHAT_MODELS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <p className="model-caption">Switch between quality, speed, and reasoning-focused models. No key? Deterministic graph mode is ready.</p>
      <div ref={historyRef} className="chat-history" aria-live="polite" aria-label="Assistant conversation">
        {!messages.length && <p className="empty-state">Your conversation will appear here.</p>}
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
            <span>{message.role === 'user' ? 'YOU' : 'AI'}</span>
            <p>{message.content}</p>
            {message.graphUpdated && <div className="graph-updated-chip"><span>✓</span> Graph Updated</div>}
          </div>
        ))}
        {busy && <div className="typing-indicator" aria-label="Assistant is typing"><span /><span /><span /></div>}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input className="control-input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Try: connect API -> database -> dashboard" disabled={busy} />
        <button className="run-button" type="submit" disabled={busy || !question.trim()}>{busy ? '…' : 'Send'}</button>
      </form>
      {error && <p className="tool-error">{error}</p>}
    </div>
  )
}
