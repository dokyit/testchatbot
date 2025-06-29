import React, { useState, useEffect, useRef, useContext } from 'react';
import { motion } from 'framer-motion';
import { getOllamaModels } from '../lib/ollama';
import { ApiKeyContext } from '../App';
import ApiKeyModal from './ApiKeyModal';

const ModelSelector = ({ onSelectModel, currentModel }) => {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(currentModel || { provider: '', name: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [pendingModel, setPendingModel] = useState(null);
  const hasInitialized = useRef(false);
  const { apiKeys } = useContext(ApiKeyContext);

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
          { provider: 'openrouter', name: 'openrouter' }
        ];
        
        setModels(allModels);
        
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
  }, []);

  const requiresApiKey = (provider) => {
    return provider !== 'ollama';
  };

  const handleSelect = (e) => {
    const [provider, name] = e.target.value.split('|');
    if (provider && name) {
      const model = { provider, name };
      
      // Check if model requires API key
      if (requiresApiKey(provider) && !apiKeys[provider]) {
        setPendingModel(model);
        setShowApiKeyModal(true);
        return;
      }
      
      setSelectedModel(model);
      onSelectModel(model);
    }
  };

  const handleApiKeySubmit = (model) => {
    setSelectedModel(model);
    onSelectModel(model);
    setShowApiKeyModal(false);
    setPendingModel(null);
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
    
    if (model.provider === 'openrouter') {
      return `${providerNames[model.provider]} (Custom Model)`;
    }
    
    return `${providerNames[model.provider] || model.provider}: ${model.name}`;
  };

  return (
    <>
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
              {requiresApiKey(model.provider) && !apiKeys[model.provider] && ' (API Key Required)'}
            </option>
          ))}
        </select>
        
        {selectedModel.provider && selectedModel.name && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Selected: {getModelDisplayName(selectedModel)}
          </div>
        )}
      </motion.div>

      {showApiKeyModal && (
        <ApiKeyModal
          model={pendingModel}
          onSubmit={handleApiKeySubmit}
          onCancel={() => {
            setShowApiKeyModal(false);
            setPendingModel(null);
          }}
        />
      )}
    </>
  );
};

export default ModelSelector;