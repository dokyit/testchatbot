import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getOllamaModels } from '../lib/ollama';

const ModelSelector = ({ onSelectModel, currentModel }) => {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(currentModel || { provider: '', name: '' });
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  // Update selected model when currentModel prop changes
  useEffect(() => {
    if (currentModel && currentModel.name && currentModel.provider) {
      setSelectedModel(currentModel);
    }
  }, [currentModel]);

  useEffect(() => {
    async function fetchModels() {
      setIsLoading(true);
      try {
        const ollamaModels = await getOllamaModels();
        
        const allModels = [
          ...ollamaModels.map(m => ({ provider: 'ollama', name: m })),
          { provider: 'openai', name: 'gpt-4o' },
          { provider: 'openai', name: 'gpt-4o-mini' },
          { provider: 'anthropic', name: 'claude-3-5-sonnet-20241022' },
          { provider: 'anthropic', name: 'claude-3-5-haiku-20241022' },
          { provider: 'gemini', name: 'gemini-1.5-pro' },
          { provider: 'gemini', name: 'gemini-1.5-flash' },
          { provider: 'grok', name: 'grok-3' },
          { provider: 'deepseek', name: 'deepseek-coder' },
          { provider: 'openrouter', name: 'openai/gpt-4o' }
        ];
        
        setModels(allModels);
        
        // Only set default model on initial load
        if (!hasInitialized.current && allModels.length > 0) {
          const defaultModel = ollamaModels.length > 0 
            ? { provider: 'ollama', name: ollamaModels[0] }
            : allModels[0];
          
          setSelectedModel(defaultModel);
          onSelectModel(defaultModel);
          hasInitialized.current = true;
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        
        // Fallback models if Ollama is not available
        const fallbackModels = [
          { provider: 'openai', name: 'gpt-4o' },
          { provider: 'anthropic', name: 'claude-3-5-sonnet-20241022' },
          { provider: 'gemini', name: 'gemini-1.5-pro' }
        ];
        
        setModels(fallbackModels);
        
        if (!hasInitialized.current) {
          const defaultModel = fallbackModels[0];
          setSelectedModel(defaultModel);
          onSelectModel(defaultModel);
          hasInitialized.current = true;
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchModels();
  }, []); // Empty dependency array - only run once

  const handleSelect = (e) => {
    const [provider, name] = e.target.value.split('|');
    if (provider && name) {
      const model = { provider, name };
      setSelectedModel(model);
      onSelectModel(model);
    }
  };

  const getModelDisplayName = (model) => {
    const providerNames = {
      ollama: 'Ollama',
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      gemini: 'Google',
      grok: 'xAI',
      deepseek: 'DeepSeek',
      openrouter: 'OpenRouter'
    };
    
    return `${providerNames[model.provider] || model.provider}: ${model.name}`;
  };

  return (
    <motion.div
      className="w-full max-w-xs"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <select
        className={`w-full p-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          document.documentElement.classList.contains('dark') 
            ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-400' 
            : 'bg-gray-100 text-gray-800 border-gray-300 focus:border-blue-500'
        }`}
        onChange={handleSelect}
        value={selectedModel.provider && selectedModel.name ? `${selectedModel.provider}|${selectedModel.name}` : ''}
        disabled={isLoading}
      >
        {isLoading && (
          <option value="">Loading models...</option>
        )}
        {!isLoading && models.length === 0 && (
          <option value="">No models available</option>
        )}
        {!isLoading && models.length > 0 && !selectedModel.name && (
          <option value="">Select a model...</option>
        )}
        {models.map(model => (
          <option 
            key={`${model.provider}|${model.name}`} 
            value={`${model.provider}|${model.name}`}
          >
            {getModelDisplayName(model)}
          </option>
        ))}
      </select>
      
      {selectedModel.provider && selectedModel.name && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Selected: {getModelDisplayName(selectedModel)}
        </div>
      )}
    </motion.div>
  );
};

export default ModelSelector;