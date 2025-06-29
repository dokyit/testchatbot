import axios from 'axios'

const ollamaUrl = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434'

export async function getOllamaModels() {
  try {
    const response = await axios.get(`${ollamaUrl}/api/tags`)
    return response.data.models.map(model => model.name)
  } catch (error) {
    console.error('Error fetching Ollama models:', error)
    return []
  }
}

export async function callOllama(prompt, model) {
  try {
    const response = await axios.post(`${ollamaUrl}/api/generate`, {
      model,
      prompt,
      stream: false
    })
    return response.data.response
  } catch (error) {
    console.error('Error calling Ollama:', error)
    return 'Error: Unable to reach Ollama'
  }
}
