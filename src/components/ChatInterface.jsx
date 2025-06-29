import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSend } from 'react-icons/fi'
import { callOllama } from '../lib/ollama'
import { callProvider } from '../lib/apiProviders'
import { supabase } from '../lib/supabase'
import ModelSelector from './ModelSelector'

const ChatInterface = ({ chatId, messages: initialMessages, onUpdateMessages }) => {
  const [messages, setMessages] = useState(initialMessages || [])
  const [input, setInput] = useState('')
  const [model, setModel] = useState({ provider: 'ollama', name: '' })
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (chatId) {
      setMessages(initialMessages || [])
    }
  }, [chatId, initialMessages])

  const handleSend = async () => {
    if (!input.trim()) return

    const newMessages = [...messages, { role: 'user', content: input }]
    setMessages(newMessages)
    setInput('')

    const context = newMessages.map(m => `${m.role}: ${m.content}`).join('\n')
    let response
    if (model.provider === 'ollama') {
      response = await callOllama(context, model.name)
    } else {
      response = await callProvider(model.provider, context, model.name)
    }

    const updatedMessages = [...newMessages, { role: 'assistant', content: response }]
    setMessages(updatedMessages)
    onUpdateMessages(updatedMessages)

    if (chatId) {
      await supabase
        .from('chats')
        .update({ messages: updatedMessages, title: newMessages[0].content.substring(0, 50) })
        .eq('id', chatId)
    } else {
      const { data } = await supabase
        .from('chats')
        .insert({ messages: updatedMessages, title: input.substring(0, 50) })
        .select()
      onUpdateMessages(updatedMessages, data[0].id)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
      <div className="p-4 bg-white shadow">
        <ModelSelector onSelectModel={setModel} />
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
              {message.content}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      <motion.div
        className="p-4 bg-white"
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
            className="flex-1 p-2 rounded-l border border-gray-300 focus:outline-none"
            placeholder="Type your message..."
          />
          <motion.button
            className="p-2 bg-blue-500 text-white rounded-r"
            onClick={handleSend}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiSend />
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export default ChatInterface
