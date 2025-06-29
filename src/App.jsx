import React, { useState, createContext, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { supabase } from './lib/supabase';

// Create Theme Context
export const ThemeContext = createContext();

function App() {
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentMessages, setCurrentMessages] = useState([]);
  const [theme, setTheme] = useState('light');

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleSelectChat = (chat) => {
    setCurrentChatId(chat.id);
    setCurrentMessages(chat.messages || []);
  };

  const handleNewChat = async () => {
    // Save current chat if it has messages
    if (currentChatId && currentMessages.length > 0) {
      await supabase
        .from('chats')
        .update({
          messages: currentMessages,
          title: currentMessages[0]?.content?.substring(0, 50) || 'Untitled Chat',
        })
        .eq('id', currentChatId);
    }
    // Create a new chat in Supabase
    const { data, error } = await supabase
      .from('chats')
      .insert({ messages: [], title: 'New Chat' })
      .select();
    if (error) {
      console.error('Error creating new chat:', error);
    } else {
      setCurrentChatId(data[0].id);
      setCurrentMessages([]);
    }
  };

  const handleUpdateMessages = async (messages, chatId) => {
    setCurrentMessages(messages);
    if (chatId) {
      await supabase
        .from('chats')
        .update({ messages, title: messages[0]?.content?.substring(0, 50) || 'Untitled Chat' })
        .eq('id', chatId);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className="flex h-screen">
        <Sidebar onSelectChat={handleSelectChat} onNewChat={handleNewChat} />
        <ChatInterface
          chatId={currentChatId}
          messages={currentMessages}
          onUpdateMessages={handleUpdateMessages}
        />
      </div>
    </ThemeContext.Provider>
  );
}

export default App;