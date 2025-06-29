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
  const [refreshSidebar, setRefreshSidebar] = useState(0);
  const [apiKeys, setApiKeys] = useState({});

  // Load API keys from localStorage
  useEffect(() => {
    const savedApiKeys = localStorage.getItem('apiKeys');
    if (savedApiKeys) {
      setApiKeys(JSON.parse(savedApiKeys));
    }
  }, []);

  // Save API keys to localStorage whenever they change
  const updateApiKey = (provider, key) => {
    const newApiKeys = { ...apiKeys, [provider]: key };
    setApiKeys(newApiKeys);
    localStorage.setItem('apiKeys', JSON.stringify(newApiKeys));
  };

  // Check authentication state
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_OUT') {
          setCurrentChatId(null);
          setCurrentMessages([]);
        }
        setLoading(false);
      }
    );

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

  const saveCurrentChat = async () => {
    if (!user || !currentChatId || currentMessages.length === 0) {
      return true;
    }

    try {
      console.log('Saving current chat:', currentChatId, 'with', currentMessages.length, 'messages');
      
      const { error } = await supabase
        .from('chats')
        .update({
          messages: currentMessages,
          title: currentMessages[0]?.content?.substring(0, 50) || 'Untitled Chat'
        })
        .eq('id', currentChatId)
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error saving current chat:', error);
        return false;
      } else {
        console.log('Current chat saved successfully');
        return true;
      }
    } catch (err) {
      console.error('Network error saving chat:', err);
      return false;
    }
  };

  const handleSelectChat = async (chat) => {
    await saveCurrentChat();
    
    console.log('Selecting chat:', chat.id);
    setCurrentChatId(chat.id);
    setCurrentMessages(chat.messages || []);
  };

  const handleNewChat = async () => {
    if (!user) return;

    try {
      const saveSuccess = await saveCurrentChat();
      
      if (saveSuccess && currentChatId && currentMessages.length > 0) {
        setRefreshSidebar(prev => prev + 1);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const { data, error } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          messages: [], 
          title: 'New Chat'
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating new chat:', error);
        const tempChatId = `temp-${Date.now()}`;
        setCurrentChatId(tempChatId);
        setCurrentMessages([]);
      } else {
        console.log('New chat created:', data);
        setCurrentChatId(data.id);
        setCurrentMessages([]);
        setRefreshSidebar(prev => prev + 1);
      }
    } catch (err) {
      console.error('Network error creating new chat:', err);
      const tempChatId = `temp-${Date.now()}`;
      setCurrentChatId(tempChatId);
      setCurrentMessages([]);
    }
  };

  const handleUpdateMessages = async (messages, chatId) => {
    setCurrentMessages(messages);
    
    if (!user || !chatId || messages.length === 0) return;

    try {
      if (chatId.startsWith('temp-')) {
        const { data, error } = await supabase
          .from('chats')
          .insert({
            user_id: user.id,
            messages,
            title: messages[0]?.content?.substring(0, 50) || 'Untitled Chat'
          })
          .select()
          .single();

        if (!error && data) {
          setCurrentChatId(data.id);
          setRefreshSidebar(prev => prev + 1);
          return;
        }
      }

      const { error } = await supabase
        .from('chats')
        .update({ 
          messages, 
          title: messages[0]?.content?.substring(0, 50) || 'Untitled Chat'
        })
        .eq('id', chatId)
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error updating messages:', error);
      } else {
        // Only refresh occasionally to reduce animation
        if (Math.random() < 0.3) {
          setRefreshSidebar(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error('Network error updating messages:', err);
    }
  };

  const handleSignOut = async () => {
    await saveCurrentChat();
    await supabase.auth.signOut();
  };

  // Reduced auto-save frequency to minimize refreshes
  useEffect(() => {
    if (!user) return;

    const autoSaveInterval = setInterval(() => {
      if (currentChatId && currentMessages.length > 0) {
        saveCurrentChat();
      }
    }, 60000); // Changed to 60 seconds

    const handleBeforeUnload = () => {
      if (currentChatId && currentMessages.length > 0) {
        saveCurrentChat();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(autoSaveInterval);
    };
  }, [user, currentChatId, currentMessages]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
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
        <div className="flex h-screen">
          <Sidebar 
            onSelectChat={handleSelectChat} 
            onNewChat={handleNewChat}
            currentChatId={currentChatId}
            refreshTrigger={refreshSidebar}
            user={user}
            onSignOut={handleSignOut}
          />
          <ChatInterface
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