import axios from 'axios'

const providers = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: { Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}` },
    model: 'gpt-4o'
  },
  grok: {
    url: 'https://api.x.ai/v1/chat/completions',
    headers: { Authorization: `Bearer ${import.meta.env.VITE_GROK_API_KEY}` },
    model: 'grok-3'
  },
  gemini: {
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
    headers: { 'Content-Type': 'application/json' },
    model: 'gemini-1.5-pro'
  },
  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    headers: { Authorization: `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}` },
    model: 'deepseek-coder'
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    headers: { 'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY },
    model: 'claude-3-5-sonnet-20241022'
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    headers: { Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}` },
    model: 'openai/gpt-4o'
  }
}

export async function callProvider(provider, prompt, model = providers[provider].model) {
  try {
    const config = providers[provider]
    const isGemini = provider === 'gemini'
    const data = isGemini
      ? {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 500 }
        }
      : {
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500
        }
    const response = await axios.post(config.url, data, { headers: config.headers })
    return isGemini
      ? response.data.candidates[0].content.parts[0].text
      : response.data.choices[0].message.content
  } catch (error) {
    console.error(`Error calling ${provider}:`, error)
    return `Error: Unable to reach ${provider}`
  }
}
