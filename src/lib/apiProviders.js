import axios from 'axios'

// LLaVA Backend URL
const LLAVA_BACKEND_URL = 'http://localhost:8001'

export async function analyzeImageWithLLaVA(imageFile, prompt = "Describe this image in detail and identify key objects, people, and activities.") {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('prompt', prompt);
    
    const response = await axios.post(`${LLAVA_BACKEND_URL}/analyze-image-file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 second timeout for image analysis
    });
    
    return response.data;
  } catch (error) {
    console.error('Error analyzing image with LLaVA:', error);
    if (error.code === 'ECONNREFUSED') {
      throw new Error('LLaVA backend server is not running. Please start the Python backend.');
    }
    throw new Error(`Image analysis failed: ${error.message}`);
  }
}

export async function analyzeImageWithLLaVABase64(imageBase64, prompt = "Describe this image in detail and identify key objects, people, and activities.") {
  try {
    const response = await axios.post(`${LLAVA_BACKEND_URL}/analyze-image`, {
      image_base64: imageBase64,
      prompt: prompt
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error analyzing image with LLaVA (base64):', error);
    if (error.code === 'ECONNREFUSED') {
      throw new Error('LLaVA backend server is not running. Please start the Python backend.');
    }
    throw new Error(`Image analysis failed: ${error.message}`);
  }
}

// Keep legacy function name for compatibility but use LLaVA
export async function analyzeImageWithRAM(imageFile) {
  return analyzeImageWithLLaVA(imageFile);
}

export async function callProviderWithImage(provider, prompt, model, apiKey, imageBase64) {
  try {
    const configs = {
      openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: model.includes('vision') || model.includes('4o') ? model : 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { 
                  type: 'image_url', 
                  image_url: { url: imageBase64 }
                }
              ]
            }
          ],
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
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { 
                  type: 'image', 
                  source: { 
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
                  }
                }
              ]
            }
          ]
        }
      },
      gemini: {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-pro'}:generateContent?key=${apiKey}`,
        headers: { 'Content-Type': 'application/json' },
        data: {
          contents: [
            {
              parts: [
                { text: prompt },
                { 
                  inline_data: {
                    mime_type: imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
                    data: imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
                  }
                }
              ]
            }
          ],
          generationConfig: { maxOutputTokens: 2000 }
        }
      },
      // Add LLaVA as a provider option
      llava: {
        url: `${LLAVA_BACKEND_URL}/analyze-image`,
        headers: { 'Content-Type': 'application/json' },
        data: {
          image_base64: imageBase64,
          prompt: prompt
        }
      }
    };

    const config = configs[provider];
    if (!config) {
      throw new Error(`Provider ${provider} doesn't support vision`);
    }

    const response = await axios.post(config.url, config.data, { headers: config.headers });
    
    if (provider === 'llava') {
      return response.data.analysis || response.data.description;
    } else if (provider === 'gemini') {
      return response.data.candidates[0].content.parts[0].text;
    } else if (provider === 'anthropic') {
      return response.data.content[0].text;
    } else {
      return response.data.choices[0].message.content;
    }
  } catch (error) {
    console.error(`Error calling ${provider} with image:`, error);
    throw new Error(`Unable to analyze image with ${provider}: ${error.message}`);
  }
}

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