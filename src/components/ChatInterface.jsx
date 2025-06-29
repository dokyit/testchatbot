import React, { useState, useEffect, useRef, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiSun, FiMoon, FiChevronDown } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown'; // Import for safe Markdown rendering
import { callOllama } from '../lib/ollama';
import { callProvider } from '../lib/apiProviders';
import { supabase } from '../lib/supabase';
import ModelSelector from './ModelSelector';
import { ThemeContext } from '../App';

const ChatInterface = ({ chatId, messages: initialMessages, onUpdateMessages }) => {
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState('');
  const [model, setModel] = useState({ provider: 'ollama', name: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState(null);
  const messagesEndRef = useRef(null);
  const { theme, toggleTheme } = useContext(ThemeContext);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (chatId) {
      setMessages(initialMessages || []);
    }
  }, [chatId, initialMessages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const context = newMessages.map((m) => `${m.role}: ${m.content}`).join('\n');
    let response = '';
    let reasoning = 'The AI processed the input by analyzing the context and generating a response based on the selected model.';
    try {
      if (model.provider === 'ollama') {
        response = await callOllama(context, model.name);
      } else {
        response = await callProvider(model.provider, context, model.name);
      }

      // Extract reasoning from <think> tags
      const thinkMatch = response.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch) {
        reasoning = thinkMatch[1]
          .trim()
          .replace(/[*"`]+/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        response = response.replace(/<think>[\s\S]*?<\/think>/, '').trim();
      }

      // Clean up response but preserve Markdown/HTML structure
      response = response
        .replace(/^\*+|\*+$/g, '') // Remove leading/trailing asterisks
        .replace(/^`+|`+$/g, '')   // Remove leading/trailing backticks
        .trim();

      // Enhance response with context-aware formatting
      if (input.toLowerCase().includes('project') || input.toLowerCase().includes('code')) {
        response = response.replace(/(\d+\.\s*[^:\n]+):/g, '### $1:') // Convert numbered lists to Markdown headings
          .replace(/^- /gm, '- ') // Ensure proper list formatting
          .replace(/\n{2,}/g, '\n\n'); // Normalize paragraph spacing
      } else if (input.toLowerCase().includes('model') || input.toLowerCase().includes('ai')) {
        response = `**${response}**`; // Bold the response for emphasis
      }

      // Ensure response is not empty
      if (!response) {
        response = 'Sorry, I couldn’t generate a meaningful response. Please try again!';
      }
    } catch (error) {
      response = `Error: Unable to get response from ${model.provider}`;
      reasoning = `The AI encountered an error while trying to connect to ${model.provider}. Details: ${error.message}`;
    }

    const updatedMessages = [...newMessages, { role: 'assistant', content: response, reasoning }];
    setMessages(updatedMessages);
    setIsLoading(false);
    onUpdateMessages(updatedMessages, chatId);
  };

  const toggleReasoning = (index) => {
    setExpandedReasoning(expandedReasoning === index ? null : index);
  };

  return (
    <div className="flex-1 flex flex-col h-screen">
      <div className={`p-4 shadow ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
        <div className="flex justify-between items-center">
          <ModelSelector onSelectModel={setModel} />
          <motion.button
            className="p-2 rounded accent-button"
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {theme === 'light' ? <FiMoon /> : <FiSun />}
          </motion.button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              className={`chat-bubble ${message.role === 'user' ? 'user-bubble' : 'ai-bubble'}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {message.role === 'user' ? (
                message.content
              ) : (
                <ReactMarkdown className="prose" children={message.content} />
              )}
              {message.role === 'assistant' && message.reasoning && (
                <div className="mt-2">
                  <button
                    className="flex items-center text-sm secondary-text"
                    onClick={() => toggleReasoning(index)}
                  >
                    Reason <FiChevronDown className={`ml-1 ${expandedReasoning === index ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedReasoning === index && (
                    <motion.div
                      className="mt-2 text-sm secondary-text"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ReactMarkdown className="prose" children={message.reasoning} />
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              className="chat-bubble ai-bubble flex space-x-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.span
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 0.5, delay: 0 }}
              >
                .
              </motion.span>
              <motion.span
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }}
              >
                .
              </motion.span>
              <motion.span
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 0.5, delay: 0.4 }}
              >
                .
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      <motion.div
        className={`p-4 ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className={`flex-1 p-2 rounded-l border ${
              theme === 'light' ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700'
            } focus:outline-none`}
            placeholder="Type your message..."
          />
          <motion.button
            className="p-2 rounded-r accent-button"
            onClick={handleSend}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiSend />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatInterface;