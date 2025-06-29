import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatInterface from './components/ChatInterface'

function App() {
  const [currentChatId, setCurrentChatId] = useState(null)
  const [currentMessages, setCurrentMessages] = useState([])

  const handleSelectChat = (chat) => {
    setCurrentChatId(chat.id)
    setCurrentMessages(chat.messages || [])
  }

  const handleNewChat = () => {
    setCurrentChatId(null)
    setCurrentMessages([])
  }

  const handleUpdateMessages = (messages, newChatId) => {
    setCurrentMessages(messages)
    if (newChatId) setCurrentChatId(newChatId)
  }

  return (
    <div className="flex h-screen">
      <Sidebar onSelectChat={handleSelectChat} onNewChat={handleNewChat} />
      <ChatInterface
        chatId={currentChatId}
        messages={currentMessages}
        onUpdateMessages={handleUpdateMessages}
      />
    </div>
  )
}

export default App
