import React, { useMemo, useState } from 'react'
import { chat } from '../api'
import { CHAT_MODELS } from '../models'

export default function AssistantPanel({ apiKey, setApiKey, graph }) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [model, setModel] = useState(CHAT_MODELS[0].id)
  const graphContext = useMemo(() => graph ? JSON.stringify(graph) : '', [graph])

  async function submit(event) {
    event.preventDefault()
    const text = question.trim()
    if (!text) return
    if (!apiKey.trim()) return setError('Enter a Groq API key to chat.')
    setMessages((items) => [...items, { role: 'user', content: text }])
    setQuestion('')
    setError('')
    setBusy(true)
    try {
      const result = await chat(text, apiKey.trim(), graphContext, model)
      setMessages((items) => [...items, { role: 'assistant', content: result.reply || 'No response.' }])
    } catch (err) {
      setError(err.message || 'Assistant request failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool-panel assistant-panel">
      <p className="tool-description">Ask about trends, chart choices, or the graph currently in view.</p>
      <label className="tool-label" htmlFor="assistant-key">Groq API key</label>
      <input id="assistant-key" type="password" className="control-input" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="gsk_…" autoComplete="off" />
      <label className="tool-label" htmlFor="chat-model">Assistant model</label>
      <select id="chat-model" className="control-input" value={model} onChange={(event) => setModel(event.target.value)}>
        {CHAT_MODELS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <p className="model-caption">Switch between quality, speed, and reasoning-focused models.</p>
      <div className="chat-history" aria-live="polite">
        {!messages.length && <p className="empty-state">Your conversation will appear here.</p>}
        {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}><span>{message.role === 'user' ? 'YOU' : 'AI'}</span><p>{message.content}</p></div>)}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input className="control-input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What does this graph show?" />
        <button className="run-button" type="submit" disabled={busy}>{busy ? '…' : 'Ask'}</button>
      </form>
      {error && <p className="tool-error">{error}</p>}
    </div>
  )
}
