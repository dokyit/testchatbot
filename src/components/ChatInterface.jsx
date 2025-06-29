import React, { useState, useEffect, useRef, useContext, Component, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiSun, FiMoon, FiChevronDown } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { callOllama } from '../lib/ollama';
import { callProvider } from '../lib/apiProviders';
import { supabase } from '../lib/supabase';
import ModelSelector from './ModelSelector';
import { ThemeContext } from '../App';

// Error Boundary Class Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ChatInterface Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="chat-bubble ai-bubble p-4 text-red-500">
          <p>Something went wrong. Please try again or restart the app.</p>
          <p className="text-sm mt-2">Error: {this.state.error?.message}</p>
          <button
            className="mt-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Restart App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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

  const handleModelSelect = useCallback((newModel) => {
    setModel(newModel);
    console.log('Model selected:', newModel);
  }, []);

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
      if (!model.name) {
        throw new Error('No model selected. Please choose a model from the selector.');
      }

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

      if (!response) {
        response = 'Sorry, I couldn\'t generate a meaningful response. Please try again!';
      }
    } catch (error) {
      response = `Error: ${error.message || 'Unable to get response from the selected model'}`;
      reasoning = `The AI encountered an error: ${error.message || 'Unknown error'}`;
      console.error('API Error:', error);
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
    <ErrorBoundary>
      <div className="flex-1 flex flex-col h-screen">
        <div className={`p-4 shadow ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
          <div className="flex justify-between items-center">
            <ModelSelector
              onSelectModel={handleModelSelect}
              currentModel={model}
            />
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
                  <div className="whitespace-pre-wrap">{message.content}</div>
                ) : (
                  <div className="markdown-content">
                    <ReactMarkdown
                      components={{
                        p: ({ children, ...props }) => (
                          <p className="mb-2 leading-relaxed" {...props}>{children}</p>
                        ),
                        h1: ({ children, ...props }) => (
                          <h1 className="text-2xl font-bold mt-4 mb-2 text-gray-900 dark:text-white" {...props}>
                            {children}
                          </h1>
                        ),
                        h2: ({ children, ...props }) => (
                          <h2 className="text-xl font-bold mt-3 mb-2 text-gray-800 dark:text-gray-100" {...props}>
                            {children}
                          </h2>
                        ),
                        h3: ({ children, ...props }) => (
                          <h3 className="text-lg font-bold mt-2 mb-1 text-gray-700 dark:text-gray-200" {...props}>
                            {children}
                          </h3>
                        ),
                        ul: ({ children, ...props }) => (
                          <ul className="list-disc pl-5 mb-2 space-y-1" {...props}>{children}</ul>
                        ),
                        ol: ({ children, ...props }) => (
                          <ol className="list-decimal pl-5 mb-2 space-y-1" {...props}>{children}</ol>
                        ),
                        li: ({ children, ...props }) => (
                          <li className="leading-relaxed" {...props}>{children}</li>
                        ),
                        code: ({ children, inline, ...props }) => (
                          inline ? (
                            <code 
                              className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono text-red-600 dark:text-red-400" 
                              {...props}
                            >
                              {children}
                            </code>
                          ) : (
                            <code className="block" {...props}>{children}</code>
                          )
                        ),
                        pre: ({ children, ...props }) => (
                          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto mb-2 text-sm" {...props}>
                            {children}
                          </pre>
                        ),
                        strong: ({ children, ...props }) => (
                          <strong className="font-bold text-gray-900 dark:text-white" {...props}>{children}</strong>
                        ),
                        em: ({ children, ...props }) => (
                          <em className="italic text-gray-700 dark:text-gray-300" {...props}>{children}</em>
                        ),
                        blockquote: ({ children, ...props }) => (
                          <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2" {...props}>
                            {children}
                          </blockquote>
                        ),
                        a: ({ children, ...props }) => (
                          <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props}>
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
                
                {message.role === 'assistant' && message.reasoning && (
                  <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <button
                      className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      onClick={() => toggleReasoning(index)}
                    >
                      <span className="mr-1">Reasoning</span>
                      <FiChevronDown 
                        className={`transition-transform duration-200 ${
                          expandedReasoning === index ? 'rotate-180' : ''
                        }`} 
                      />
                    </button>
                    {expandedReasoning === index && (
                      <motion.div
                        className="mt-2"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-sm">
                          <ReactMarkdown
                            components={{
                              p: ({ children, ...props }) => (
                                <p className="mb-1 text-gray-700 dark:text-gray-300" {...props}>{children}</p>
                              ),
                              code: ({ children, ...props }) => (
                                <code className="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-xs" {...props}>
                                  {children}
                                </code>
                              ),
                            }}
                          >
                            {message.reasoning}
                          </ReactMarkdown>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
            
            {isLoading && (
              <motion.div
                className="chat-bubble ai-bubble flex items-center space-x-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="text-gray-500 dark:text-gray-400">AI is thinking</span>
                <div className="flex space-x-1">
                  <motion.span
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                  />
                  <motion.span
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                  />
                  <motion.span
                    className="w-2 h-2 bg-gray-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
        
        <motion.div
          className={`p-4 border-t ${
            theme === 'light' 
              ? 'bg-white border-gray-200' 
              : 'bg-gray-800 border-gray-700'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className={`flex-1 p-3 rounded-lg border transition-colors ${
                theme === 'light' 
                  ? 'border-gray-300 bg-white text-gray-900 focus:border-blue-500' 
                  : 'border-gray-600 bg-gray-700 text-white focus:border-blue-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              disabled={isLoading}
            />
            <motion.button
              className={`p-3 rounded-lg font-medium transition-colors ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600 focus:bg-blue-600'
              } text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              whileHover={!isLoading ? { scale: 1.05 } : {}}
              whileTap={!isLoading ? { scale: 0.95 } : {}}
            >
              <FiSend className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </ErrorBoundary>
  );
};

export default ChatInterface;