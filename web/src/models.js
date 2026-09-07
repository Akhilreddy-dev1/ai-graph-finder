// Keep the client choices aligned with the backend allowlist. These are model
// IDs, never credentials; the user's key is still entered locally at request
// time.
export const VISION_MODELS = [
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout · vision' },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', label: 'Llama 4 Maverick · vision' },
]

export const CHAT_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B · quality' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B · fast' },
  { id: 'openai/gpt-oss-120b', label: 'GPT OSS 120B · reasoning' },
  { id: 'openai/gpt-oss-20b', label: 'GPT OSS 20B · fast reasoning' },
  { id: 'qwen/qwen3-32b', label: 'Qwen 3 32B · multilingual' },
  { id: 'moonshotai/kimi-k2-instruct', label: 'Kimi K2 · long context' },
  ...VISION_MODELS,
]

