import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import { ApiKeyContext } from '../App';

const ApiKeyModal = ({ model, onSubmit, onCancel }) => {
  const [apiKey, setApiKey] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const { updateApiKey } = useContext(ApiKeyContext);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    // Save API key
    updateApiKey(model.provider, apiKey.trim());

    // For OpenRouter, use custom model name if provided
    const finalModel = model.provider === 'openrouter' && customModel.trim()
      ? { ...model, name: customModel.trim() }
      : model;

    onSubmit(finalModel);
  };

  const getProviderInfo = (provider) => {
    const info = {
      openai: {
        name: 'OpenAI',
        url: 'https://platform.openai.com/api-keys',
        placeholder: 'sk-...'
      },
      anthropic: {
        name: 'Anthropic',
        url: 'https://console.anthropic.com/settings/keys',
        placeholder: 'sk-ant-...'
      },
      gemini: {
        name: 'Google Gemini',
        url: 'https://aistudio.google.com/app/apikey',
        placeholder: 'AI...'
      },
      grok: {
        name: 'xAI Grok',
        url: 'https://console.x.ai/',
        placeholder: 'xai-...'
      },
      deepseek: {
        name: 'DeepSeek',
        url: 'https://platform.deepseek.com/api_keys',
        placeholder: 'sk-...'
      },
      openrouter: {
        name: 'OpenRouter',
        url: 'https://openrouter.ai/keys',
        placeholder: 'sk-or-...'
      }
    };
    return info[provider] || { name: provider, url: '', placeholder: '' };
  };

  const providerInfo = getProviderInfo(model.provider);

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            API Key Required
          </h2>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            To use <strong>{providerInfo.name}</strong>, please enter your API key:
          </p>
          {providerInfo.url && (
            <a
              href={providerInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 text-sm"
            >
              Get your API key here →
            </a>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={providerInfo.placeholder}
                className="w-full p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          {model.provider === 'openrouter' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Model Name (Optional)
              </label>
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="e.g., openai/gpt-4o, anthropic/claude-3-5-sonnet"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                If not specified, will use default model from your OpenRouter account
              </p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save & Use Model
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-xs text-yellow-800 dark:text-yellow-300">
            <strong>Note:</strong> Your API key is stored locally in your browser and never sent to our servers.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ApiKeyModal;