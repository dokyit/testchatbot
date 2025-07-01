import React, { useState, useEffect, useRef, useContext, Component, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiSun, FiMoon, FiChevronDown, FiPaperclip, FiCopy, FiCheck, FiEye } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import ModelSelector from './ModelSelector';
import AttachmentPreview from './AttachmentPreview';
import VoiceInput from './VoiceInput'; // Make sure this is imported
import FileUpload from './FileUpload'; // Make sure this is imported
import { ThemeContext, ApiKeyContext } from '../App';

// Import Prism.js and languages in correct dependency order
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

// Core languages first
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-java';

// Languages with dependencies last
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';

// Custom Code Block Component with Copy Button and Syntax Highlighting
const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const [isCopied, setIsCopied] = useState(false);
  const codeRef = useRef(null);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeText = String(children).replace(/\n$/, '');

  useEffect(() => {
    if (codeRef.current && language && Prism.languages[language]) {
      try {
        Prism.highlightElement(codeRef.current);
      } catch (error) {
        console.warn('Prism highlighting failed:', error);
      }
    }
  }, [language, codeText]);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  if (inline) {
    return (
      <code
        className="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-red-600 dark:text-red-400 font-mono text-sm"
        {...props}
      >
        {children}
      </code>
    );
  }

  if (!language) {
    return (
      <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto my-4">
        <code className="font-mono text-sm text-gray-800 dark:text-gray-200" {...props}>
          {children}
        </code>
      </pre>
    );
  }

  return (
    <div className="my-4 bg-gray-900 rounded-lg overflow-hidden shadow-lg">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-gray-300 font-medium text-sm capitalize">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center text-xs text-gray-400 hover:text-white transition-colors duration-200 px-2 py-1 rounded hover:bg-gray-700"
        >
          {isCopied ? (
            <>
              <FiCheck className="mr-1 text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <FiCopy className="mr-1" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto bg-gray-900">
        <code
          ref={codeRef}
          className={`language-${language} font-mono text-sm`}
          {...props}
        >
          {children}
        </code>
      </pre>
    </div>
  );
};

const PreComponent = ({ children, ...props }) => {
  return <>{children}</>;
};

const ParagraphComponent = ({ children, ...props }) => {
  const hasCodeBlock = React.Children.toArray(children).some(child =>
    React.isValidElement(child) && child.type === CodeBlock
  );

  if (hasCodeBlock) {
    return <>{children}</>;
  }

  return <p {...props}>{children}</p>;
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center text-red-600 dark:text-red-400">
          <h2>Something went wrong.</h2>
          <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try again
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
  const [model, setModel] = useState({ provider: 'ollama', name: 'llava:latest' });
  const [isLoading, setIsLoading] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { apiKeys } = useContext(ApiKeyContext);

  useEffect(() => {
    setMessages(initialMessages || []);
  }, [initialMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        Prism.highlightAll();
      } catch (error) {
        console.warn('Prism highlighting failed:', error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [messages]);

  const handleModelSelect = useCallback((newModel) => {
    setModel(newModel);
  }, []);

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setAttachment({
          name: file.name,
          type: file.type,
          size: file.size,
          previewUrl: reader.result,
          url: reader.result,
          base64: reader.result.split(',')[1]
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVoiceTranscript = (transcript) => {
    setInput(prev => prev + transcript);
  };

  const handleTranscriptionError = (errorMessage) => {
      setError(errorMessage);
      setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || isLoading) return;

    setIsLoading(true);
    const userMessage = {
      role: 'user',
      content: input,
      attachments: attachment ? [attachment] : []
    };
    const currentMessagesWithUser = [...messages, userMessage];
    setMessages(currentMessagesWithUser);
    setInput('');
    setAttachment(null);

    let aiResponseContent = '';
    let aiReasoning = '';
    let responseType = 'text_chat';

    try {
      const payload = {
        message: userMessage.content,
        image_base64: userMessage.attachments?.[0]?.base64 || null,
        model: model.name,
        conversation_history: messages.map(m => ({
          human: m.role === 'user' ? m.content : '',
          assistant: m.role === 'assistant' ? m.content : ''
        }))
      };

      const response = await fetch('http://localhost:8001/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(`API error (${response.status}): ${errData.detail || response.statusText}`);
      }

      const data = await response.json();
      let rawResponse = data.response;
      responseType = data.type;

      const thinkMatch = rawResponse.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch && thinkMatch[1]) {
        aiReasoning = thinkMatch[1].trim();
        aiResponseContent = rawResponse.replace(/<think>[\s\S]*?<\/think>/, '').trim();
      } else {
        aiResponseContent = rawResponse.trim();
        aiReasoning = `Responded using **${model.name}** via the **${responseType}** logic path.`;
      }

    } catch (error) {
      console.error("Failed to get response from AI server:", error);
      aiResponseContent = `Error: Could not connect to the AI engine. ${error.message}`;
      aiReasoning = `**Error Details:** ${error.message}`;
    }

    const aiMessage = {
      role: 'assistant',
      content: aiResponseContent,
      reasoning: aiReasoning
    };
    const finalMessages = [...currentMessagesWithUser, aiMessage];

    onUpdateMessages(finalMessages, chatId);
    setIsLoading(false);
  };

  const toggleReasoning = (index) => {
    setExpandedReasoning(expandedReasoning === index ? null : index);
  };

  const markdownComponents = {
    code: CodeBlock,
    pre: PreComponent,
    p: ParagraphComponent,
  };

  return (
    <ErrorBoundary>
      <div className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <div className={`p-4 shadow-sm border-b ${
          theme === 'light'
            ? 'bg-white border-gray-200'
            : 'bg-gray-800 border-gray-700'
        }`}>
          <div className="flex justify-between items-center">
            <ModelSelector onSelectModel={handleModelSelect} currentModel={model} />
            <motion.button
              className={`p-2 rounded-lg transition-colors ${
                theme === 'light'
                  ? 'text-gray-600 hover:bg-gray-100'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
              onClick={toggleTheme}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {theme === 'light' ? <FiMoon className="w-5 h-5" /> : <FiSun className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>

        {/* Messages Area */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
          theme === 'light' ? 'bg-gray-50' : 'bg-gray-900'
        }`}>
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                className={`max-w-4xl ${
                  message.role === 'user'
                    ? 'ml-auto'
                    : 'mr-auto'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={`p-4 rounded-lg shadow-sm ${
                  message.role === 'user'
                    ? theme === 'light'
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-600 text-white'
                    : theme === 'light'
                    ? 'bg-white text-gray-900 border border-gray-200'
                    : 'bg-gray-800 text-gray-100 border border-gray-700'
                }`}>
                  {/* Image Attachments */}
                  {message.attachments && message.attachments.length > 0 && message.attachments.map((att, i) => (
                    <div key={i} className="mb-3">
                      {att.type && att.type.startsWith('image/') ? (
                        <div className="relative group">
                          <img
                            src={att.previewUrl || att.url}
                            alt={att.name || 'Attached image'}
                            className="rounded-lg max-w-xs max-h-64 object-cover border shadow-sm cursor-pointer"
                            onClick={() => window.open(att.previewUrl || att.url, '_blank')}
                          />
                          <button
                            onClick={() => window.open(att.previewUrl || att.url, '_blank')}
                            className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-80"
                            title="View full size"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm opacity-75">
                          📎 {att.name || 'File attachment'}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Message Content */}
                  <div className={`prose prose-sm max-w-none ${
                    theme === 'dark' ? 'prose-invert' : ''
                  } ${message.role === 'user' ? 'prose-headings:text-white prose-p:text-white prose-strong:text-white prose-em:text-white prose-code:text-red-200' : ''}`}>
                    <ReactMarkdown components={markdownComponents}>
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {/* Reasoning Section */}
                  {message.role === 'assistant' && message.reasoning && (
                    <div className={`mt-4 pt-3 border-t ${
                      theme === 'light' ? 'border-gray-200' : 'border-gray-600'
                    }`}>
                      <button
                        className={`flex items-center text-sm transition-colors ${
                          theme === 'light'
                            ? 'text-gray-600 hover:text-blue-600'
                            : 'text-gray-400 hover:text-blue-400'
                        }`}
                        onClick={() => toggleReasoning(index)}
                      >
                        <span className="mr-2">💭 Reasoning</span>
                        <FiChevronDown className={`transition-transform duration-200 ${
                          expandedReasoning === index ? 'rotate-180' : ''
                        }`} />
                      </button>
                      {expandedReasoning === index && (
                        <motion.div
                          className={`mt-3 p-3 rounded-lg text-sm ${
                            theme === 'light'
                              ? 'bg-gray-50 text-gray-700'
                              : 'bg-gray-700 text-gray-300'
                          }`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className={`prose prose-sm max-w-none ${theme === 'dark' ? 'prose-invert' : ''}`}>
                            <ReactMarkdown components={markdownComponents}>
                              {message.reasoning}
                            </ReactMarkdown>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <motion.div
                className={`max-w-4xl mr-auto`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className={`p-4 rounded-lg shadow-sm ${
                  theme === 'light'
                    ? 'bg-white text-gray-900 border border-gray-200'
                    : 'bg-gray-800 text-gray-100 border border-gray-700'
                }`}>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 dark:text-gray-400">AI is thinking</span>
                    <div className="flex space-x-1">
                      <motion.span
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
                      />
                      <motion.span
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                      />
                      <motion.span
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={`p-4 border-t ${
          theme === 'light'
            ? 'bg-white border-gray-200'
            : 'bg-gray-800 border-gray-700'
        }`}>
          {error && (
            <div className="text-center text-sm text-red-500 mb-2">
              {error}
            </div>
          )}
          {attachment && (
            <AttachmentPreview
              attachments={[attachment]}
              onRemove={removeAttachment}
              theme={theme}
            />
          )}
          <div className="flex items-end space-x-2">
            <FileUpload onFileSelect={handleFileSelect} disabled={isLoading} theme={theme} />
            <VoiceInput
                onTranscript={handleVoiceTranscript}
                onTranscriptionError={handleTranscriptionError}
                disabled={isLoading}
                theme={theme}
            />

            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className={`w-full p-3 rounded-lg border transition-colors resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  theme === 'light'
                    ? 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-500 focus:bg-white focus:border-blue-500'
                    : 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:bg-gray-700 focus:border-blue-500'
                }`}
                placeholder="Type your message..."
                disabled={isLoading}
                rows={1}
                style={{ minHeight: '48px', maxHeight: '150px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
              />
            </div>

            <motion.button
              className={`p-3 rounded-lg font-medium transition-colors self-stretch flex items-center justify-center min-w-[48px] ${
                (isLoading || (!input.trim() && !attachment))
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 shadow-lg hover:shadow-xl'
              } text-white`}
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && !attachment)}
              whileHover={!isLoading && (input.trim() || attachment) ? { scale: 1.05 } : {}}
              whileTap={!isLoading && (input.trim() || attachment) ? { scale: 0.95 } : {}}
            >
              <FiSend className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ChatInterface;