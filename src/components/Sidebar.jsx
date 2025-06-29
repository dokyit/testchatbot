import React, { useState, useEffect, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { FiMessageSquare, FiPlus, FiTrash2, FiLogOut, FiUser } from 'react-icons/fi'
import { ThemeContext } from '../App'

const Sidebar = ({ onSelectChat, onNewChat, currentChatId, refreshTrigger, user, onSignOut }) => {
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const { theme } = useContext(ThemeContext)

  const fetchChats = async () => {
    if (!user) return;
    
    setLoading(true)
    try {
      console.log('Fetching chats for user:', user.id)
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        
      if (error) {
        console.error('Error fetching chats:', error)
        setChats([])
      } else {
        console.log('Loaded chats:', data?.length || 0)
        setChats(data || [])
      }
    } catch (err) {
      console.error('Network error fetching chats:', err)
      setChats([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchChats()

      // Set up real-time subscription
      const subscription = supabase
        .channel('user-chats')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'chats',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          console.log('Chat change detected:', payload)
          setTimeout(() => {
            fetchChats()
          }, 200)
        })
        .subscribe()

      return () => {
        supabase.removeChannel(subscription)
      }
    }
  }, [user])

  useEffect(() => {
    if (refreshTrigger > 0 && user) {
      console.log('Manual refresh triggered')
      fetchChats()
    }
  }, [refreshTrigger, user])

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation()
    
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId)
        .eq('user_id', user.id)
        
      if (error) {
        console.error('Error deleting chat:', error)
      } else {
        console.log('Chat deleted successfully')
        setTimeout(() => {
          fetchChats()
        }, 100)
      }
    } catch (err) {
      console.error('Network error deleting chat:', err)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.abs(now - date) / 36e5

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  return (
    <motion.div
      className={`w-64 h-screen p-4 shadow-lg ${theme === 'light' ? 'bg-white' : 'bg-gray-800'} flex flex-col`}
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* User info and sign out */}
      <div className={`p-3 rounded-lg mb-4 ${theme === 'light' ? 'bg-gray-50' : 'bg-gray-700'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FiUser className="mr-2 text-gray-500" />
            <span className={`text-sm truncate ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
              {user?.email}
            </span>
          </div>
          <button
            onClick={onSignOut}
            className={`p-1 rounded transition-colors ${
              theme === 'light' 
                ? 'hover:bg-gray-200 text-gray-600' 
                : 'hover:bg-gray-600 text-gray-400'
            }`}
            title="Sign Out"
          >
            <FiLogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <motion.button
        className={`w-full p-3 rounded mb-4 flex items-center justify-center accent-button font-medium`}
        onClick={onNewChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FiPlus className="mr-2" /> New Chat
      </motion.button>
      
      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center text-gray-500 py-4">
            Loading chats...
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <FiMessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No chats yet</p>
            <p className="text-sm">Start a new conversation!</p>
          </div>
        ) : (
          <AnimatePresence>
            {chats.map(chat => (
              <motion.div
                key={chat.id}
                className={`group p-3 rounded cursor-pointer transition-all relative ${
                  currentChatId === chat.id
                    ? theme === 'light'
                      ? 'bg-blue-100 border-l-4 border-blue-500'
                      : 'bg-blue-900 border-l-4 border-blue-400'
                    : theme === 'light'
                    ? 'hover:bg-gray-100'
                    : 'hover:bg-gray-700'
                }`}
                onClick={() => onSelectChat(chat)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1 min-w-0">
                    <FiMessageSquare className={`mr-3 mt-1 flex-shrink-0 ${
                      currentChatId === chat.id ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${
                        currentChatId === chat.id
                          ? theme === 'light' ? 'text-blue-900' : 'text-blue-100'
                          : theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                      }`}>
                        {chat.title || 'Untitled Chat'}
                      </div>
                      
                      {chat.messages && chat.messages.length > 0 && (
                        <div className={`text-sm truncate mt-1 ${
                          currentChatId === chat.id
                            ? theme === 'light' ? 'text-blue-700' : 'text-blue-300'
                            : theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {chat.messages[chat.messages.length - 1]?.content?.substring(0, 40)}...
                        </div>
                      )}
                      
                      <div className={`text-xs mt-1 ${
                        currentChatId === chat.id
                          ? theme === 'light' ? 'text-blue-600' : 'text-blue-400'
                          : 'text-gray-500'
                      }`}>
                        {formatDate(chat.updated_at || chat.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ml-2 ${
                      theme === 'light'
                        ? 'hover:bg-red-100 text-red-600'
                        : 'hover:bg-red-900 text-red-400'
                    }`}
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  )
}

export default Sidebar