import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getOllamaModels } from '../lib/ollama'

const ModelSelector = ({ onSelectModel }) => {
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('')

  useEffect(() => {
    async function fetchModels() {
      const ollamaModels = await getOllamaModels()
      const allModels = [
        ...ollamaModels.map(m => ({ provider: 'ollama', name: m })),
        { provider: 'openai', name: 'gpt-4o' },
        { provider: 'grok', name: 'grok-3' },
        { provider: 'gemini', name: 'gemini-1.5-pro' },
        { provider: 'deepseek', name: 'deepseek-coder' },
        { provider: 'anthropic', name: 'claude-3-5-sonnet-20241022' },
        { provider: 'openrouter', name: 'openai/gpt-4o' }
      ]
      setModels(allModels)
      if (ollamaModels.length > 0) {
        setSelectedModel({ provider: 'ollama', name: ollamaModels[0] })
        onSelectModel({ provider: 'ollama', name: ollamaModels[0] })
      }
    }
    fetchModels()
  }, [])

  const handleSelect = (e) => {
    const [provider, name] = e.target.value.split(':')
    const model = { provider, name }
    setSelectedModel(model)
    onSelectModel(model)
  }

  return (
    <motion.select
      className="w-full p-2 rounded bg-gray-100 text-gray-800"
      onChange={handleSelect}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {models.map(model => (
        <option key={`${model.provider}:${model.name}`} value={`${model.provider}:${model.name}`}>
          {model.provider}: {model.name}
        </option>
      ))}
    </motion.select>
  )
}

export default ModelSelector
