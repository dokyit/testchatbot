import React, { useState, useEffect, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { FiMessageSquare, FiPlus } from 'react-icons/fi'
import { ThemeContext } from '../App'

const Sidebar = ({ onSelectChat, onNewChat }) => {
  const [chats, setChats] = useState([])
  const { theme } = useContext(ThemeContext)

  useEffect(() => {
    async function fetchChats() {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Error fetching chats:', error)
      } else {
        setChats(data)
      }
    }
    fetchChats()

    const subscription = supabase
      .channel('chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        fetchChats()
      })
      .subscribe()

    return () => supabase.removeChannel(subscription)
  }, [])

  return (
    <motion.div
      className={`w-64 h-screen p-4 shadow-lg ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.button
        className={`w-full p-2 rounded mb-4 flex items-center justify-center accent-button`}
        onClick={onNewChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FiPlus className="mr-2" /> New Chat
      </motion.button>
      <div className="space-y-2">
        <AnimatePresence>
          {chats.map(chat => (
            <motion.div
              key={chat.id}
              className={`p-2 rounded cursor-pointer flex items-center ${
                theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'
              }`}
              onClick={() => onSelectChat(chat)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <FiMessageSquare className="mr-2 secondary-text" />
              <span className="secondary-text">{chat.title || 'Untitled Chat'}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default Sidebar
