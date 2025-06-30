import React, { useState, createContext, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';

export const ThemeContext = createContext();
export const ApiKeyContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentMessages, setCurrentMessages] = useState([]);
  const [theme, setTheme] = useState('light');
  const [apiKeys, setApiKeys] = useState({});
  const [refreshSidebar, setRefreshSidebar] = useState(0);

  // Load API keys from localStorage
  useEffect(() => {
    const savedApiKeys = localStorage.getItem('apiKeys');
    if (savedApiKeys) {
      try {
        setApiKeys(JSON.parse(savedApiKeys));
      } catch (error) {
        console.error('Error loading API keys:', error);
      }
    }
  }, []);

  // Save API keys to localStorage whenever they change
  const updateApiKey = (provider, key) => {
    const newApiKeys = { ...apiKeys, [provider]: key };
    setApiKeys(newApiKeys);
    localStorage.setItem('apiKeys', JSON.stringify(newApiKeys));
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (_event === 'SIGNED_OUT') {
        setCurrentChatId(null);
        setCurrentMessages([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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

  const handleNewChat = () => {
    setCurrentChatId(null);
    setCurrentMessages([]);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleUpdateMessages = async (finalMessages, chatId) => {
    setCurrentMessages(finalMessages);

    const title = finalMessages.find(m => m.role === 'user')?.content?.substring(0, 40) || 'Untitled Chat';
    
    if (!chatId) {
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert([{ user_id: user.id, messages: finalMessages, title }])
        .select()
        .single();
      if (error) console.error("Error creating new chat in Supabase:", error);
      else if (newChat) setCurrentChatId(newChat.id);
    } else {
      const { error } = await supabase
        .from('chats')
        .update({ messages: finalMessages, updated_at: new Date().toISOString() })
        .eq('id', chatId);
      if (error) console.error("Error updating chat in Supabase:", error);
    }
    setRefreshSidebar(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Auth />;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ApiKeyContext.Provider value={{ apiKeys, updateApiKey }}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar 
            user={user}
            onSelectChat={handleSelectChat} 
            onNewChat={handleNewChat}
            currentChatId={currentChatId}
            onSignOut={handleSignOut}
            refreshTrigger={refreshSidebar}
          />
          <ChatInterface
            key={currentChatId || 'new-chat'}
            chatId={currentChatId}
            messages={currentMessages}
            onUpdateMessages={handleUpdateMessages}
          />
        </div>
      </ApiKeyContext.Provider>
    </ThemeContext.Provider>
  );
}

export default App;