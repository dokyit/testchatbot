import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { FiMessageSquare, FiPlus } from 'react-icons/fi'

const Sidebar = ({ onSelectChat, onNewChat }) => {
  const [chats, setChats] = useState([])

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, (payload) => {
        fetchChats()
      })
      .subscribe()

    return () => supabase.removeChannel(subscription)
  }, [])

  return (
    <motion.div
      className="w-64 bg-white h-screen p-4 shadow-lg"
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.button
        className="w-full p-2 bg-blue-500 text-white rounded mb-4 flex items-center justify-center"
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
              className="p-2 rounded cursor-pointer hover:bg-gray-100 flex items-center"
              onClick={() => onSelectChat(chat)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <FiMessageSquare className="mr-2" />
              {chat.title || 'Untitled Chat'}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default Sidebar
