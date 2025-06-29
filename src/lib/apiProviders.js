import axios from 'axios'

export async function callProvider(provider, prompt, model, apiKey) {
  try {
    const configs = {
      openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: model || 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000
        }
      },
      grok: {
        url: 'https://api.x.ai/v1/chat/completions',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: model || 'grok-3',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000
        }
      },
      gemini: {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-pro'}:generateContent?key=${apiKey}`,
        headers: { 'Content-Type': 'application/json' },
        data: {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2000 }
        }
      },
      deepseek: {
        url: 'https://api.deepseek.com/v1/chat/completions',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: model || 'deepseek-coder',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000
        }
      },
      anthropic: {
        url: 'https://api.anthropic.com/v1/messages',
        headers: { 
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        data: {
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        }
      },
      openrouter: {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: model || 'openai/gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000
        }
      }
    }

    const config = configs[provider]
    if (!config) {
      throw new Error(`Provider ${provider} not supported`)
    }

    const response = await axios.post(config.url, config.data, { headers: config.headers })
    
    // Handle different response formats
    if (provider === 'gemini') {
      return response.data.candidates[0].content.parts[0].text
    } else if (provider === 'anthropic') {
      return response.data.content[0].text
    } else {
      return response.data.choices[0].message.content
    }
  } catch (error) {
    console.error(`Error calling ${provider}:`, error)
    if (error.response?.status === 401) {
      throw new Error(`Invalid API key for ${provider}`)
    } else if (error.response?.data?.error?.message) {
      throw new Error(error.response.data.error.message)
    } else {
      throw new Error(`Unable to reach ${provider}`)
    }
  }
}