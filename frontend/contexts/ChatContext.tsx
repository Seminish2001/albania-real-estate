'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Chat, Message } from '../types';

interface ChatContextType {
  socket: Socket | null;
  chats: Chat[];
  unreadCount: number;
  activeChat: Chat | null;
  onlineUsers: Set<string>;
  isConnected: boolean;

  setActiveChat: (chat: Chat | null) => void;
  sendMessage: (content: string, type?: 'text' | 'image' | 'file') => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;
  startTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  refreshChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const BACKEND_HOST =
  process.env.NEXT_PUBLIC_BACKEND_HOST || process.env.BACKEND_HOST || '';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  (BACKEND_HOST ? `https://${BACKEND_HOST}/api` : 'http://localhost:5000/api')
).replace(/\/$/, '');
const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeChat, setActiveChatState] = useState<Chat | null>(null);
  const [onlineUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);

  const { user } = useAuth();

  const authHeader = useMemo(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }, [user?.id]);

  const refreshUnreadCount = useCallback(async () => {
    if (!user || !authHeader) return;

    try {
      const response = await fetch(`${API_BASE_URL}/chat/unread/count`, {
        headers: authHeader
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data?.data?.count ?? 0);
      }
    } catch (error) {
      console.error('Failed to refresh unread count:', error);
    }
  }, [authHeader, user]);

  const refreshChats = useCallback(async () => {
    if (!user || !authHeader) return;

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        headers: authHeader
      });

      if (response.ok) {
        const data = await response.json();
        const fetchedChats: Chat[] = data?.data?.chats ?? [];
        setChats(fetchedChats);

        if (activeChat) {
          const updatedActive = fetchedChats.find((chat) => chat.id === activeChat.id);
          if (updatedActive) {
            setActiveChatState((prev) =>
              prev ? { ...updatedActive, messages: prev.messages } : prev
            );
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh chats:', error);
    }
  }, [activeChat, authHeader, user]);

  const loadInitialData = useCallback(async () => {
    await Promise.all([refreshChats(), refreshUnreadCount()]);
  }, [refreshChats, refreshUnreadCount]);

  useEffect(() => {
    if (!user) {
      setChats([]);
      setActiveChatState(null);
      setUnreadCount(0);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setIsConnected(false);
      return;
    }

    const newSocket = io(SOCKET_BASE_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      newSocket.emit('join-user', user.id);
      loadInitialData();
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [loadInitialData, user]);

  const markAsRead = useCallback(async (chatId: string) => {
    if (!authHeader) return;

    try {
      await fetch(`${API_BASE_URL}/chat/${chatId}/messages/read`, {
        method: 'PUT',
        headers: authHeader
      });

      setChats((prevChats) => {
        let unreadCleared = 0;
        const updatedChats = prevChats.map((chat) => {
          if (chat.id !== chatId) return chat;
          unreadCleared = chat.unreadCount ?? 0;
          return {
            ...chat,
            unreadCount: 0,
            messages: chat.messages?.map((msg) =>
              msg.senderId !== user?.id ? { ...msg, read: true } : msg
            )
          };
        });

        if (unreadCleared > 0) {
          setUnreadCount((prev) => Math.max(0, prev - unreadCleared));
        }

        return updatedChats;
      });

      setActiveChatState((prev) => {
        if (!prev || prev.id !== chatId) return prev;
        return {
          ...prev,
          unreadCount: 0,
          messages: prev.messages?.map((msg) =>
            msg.senderId !== user?.id ? { ...msg, read: true } : msg
          )
        };
      });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, [authHeader, user?.id]);

  const handleChatUpdate = useCallback((chatId: string, lastMessage: string, lastMessageAt: string) => {
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === chatId
          ? { ...chat, lastMessage, lastMessageAt }
          : chat
      )
    );

    setActiveChatState((prev) =>
      prev && prev.id === chatId
        ? { ...prev, lastMessage, lastMessageAt }
        : prev
    );
  }, []);

  const handleMessagesRead = useCallback((chatId: string, readerId: string) => {
    if (readerId === user?.id) return;

    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: chat.messages?.map((msg) =>
                msg.senderId === user?.id ? { ...msg, read: true } : msg
              )
            }
          : chat
      )
    );

    setActiveChatState((prev) =>
      prev && prev.id === chatId
        ? {
            ...prev,
            messages: prev.messages?.map((msg) =>
              msg.senderId === user?.id ? { ...msg, read: true } : msg
            )
          }
        : prev
    );
  }, [user?.id]);

  const handleNewMessage = useCallback((chatId: string, message: Message) => {
    let chatFound = false;
    let unreadIncrement = 0;
    const isOwnMessage = message.senderId === user?.id;
    const isActiveChat = activeChat?.id === chatId;

    setChats((prevChats) => {
      const updatedChats = prevChats.map((chat) => {
        if (chat.id !== chatId) {
          return chat;
        }

        chatFound = true;
        const updatedMessages = [...(chat.messages || []), message];
        const nextUnreadCount = isOwnMessage
          ? chat.unreadCount ?? 0
          : isActiveChat
            ? 0
            : (chat.unreadCount ?? 0) + 1;

        if (!isOwnMessage && !isActiveChat) {
          unreadIncrement += 1;
        }

        return {
          ...chat,
          lastMessage: message.content,
          lastMessageAt: message.createdAt,
          messages: updatedMessages,
          unreadCount: nextUnreadCount
        };
      });

      return chatFound ? updatedChats : prevChats;
    });

    setActiveChatState((prev) => {
      if (!prev || prev.id !== chatId) return prev;
      const updatedMessages = [...(prev.messages || []), message];
      return {
        ...prev,
        lastMessage: message.content,
        lastMessageAt: message.createdAt,
        messages: updatedMessages
      };
    });

    if (!chatFound) {
      refreshChats();
    }

    if (!isOwnMessage) {
      if (isActiveChat) {
        markAsRead(chatId);
      } else if (unreadIncrement > 0) {
        setUnreadCount((prev) => prev + unreadIncrement);
      }
    }
  }, [activeChat?.id, markAsRead, refreshChats, user?.id]);

  const handleUserTyping = useCallback((chatId: string, userId: string, typing: boolean) => {
    console.log(`User ${userId} is ${typing ? 'typing' : 'not typing'} in chat ${chatId}`);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const newMessageListener = ({ chatId, message }: { chatId: string; message: Message }) => {
      handleNewMessage(chatId, message);
    };

    const chatUpdatedListener = ({ chatId, lastMessage, lastMessageAt }: { chatId: string; lastMessage: string; lastMessageAt: string }) => {
      handleChatUpdate(chatId, lastMessage, lastMessageAt);
    };

    const messagesReadListener = ({ chatId, readerId }: { chatId: string; readerId: string }) => {
      handleMessagesRead(chatId, readerId);
    };

    const userTypingListener = ({ chatId, userId, typing }: { chatId: string; userId: string; typing: boolean }) => {
      handleUserTyping(chatId, userId, typing);
    };

    socket.on('new-message', newMessageListener);
    socket.on('chat-updated', chatUpdatedListener);
    socket.on('messages-read', messagesReadListener);
    socket.on('user-typing', userTypingListener);

    return () => {
      socket.off('new-message', newMessageListener);
      socket.off('chat-updated', chatUpdatedListener);
      socket.off('messages-read', messagesReadListener);
      socket.off('user-typing', userTypingListener);
    };
  }, [handleChatUpdate, handleMessagesRead, handleNewMessage, handleUserTyping, socket]);

  const setActiveChat = useCallback((chat: Chat | null) => {
    if (socket) {
      if (activeChat?.id && activeChat.id !== chat?.id) {
        socket.emit('leave-chat', activeChat.id);
      }

      if (chat?.id) {
        socket.emit('join-chat', chat.id);
      }
    }

    setActiveChatState(chat);

    if (chat?.id) {
      markAsRead(chat.id);
    }
  }, [activeChat?.id, markAsRead, socket]);

  const sendMessage = useCallback(async (content: string, type: 'text' | 'image' | 'file' = 'text') => {
    if (!activeChat || !content.trim() || !authHeader) return;

    try {
      const response = await fetch(`${API_BASE_URL}/chat/${activeChat.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({ content, type })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [activeChat, authHeader]);

  const startTyping = useCallback((chatId: string) => {
    if (socket && user) {
      socket.emit('typing-start', { chatId, userId: user.id });
    }
  }, [socket, user]);

  const stopTyping = useCallback((chatId: string) => {
    if (socket && user) {
      socket.emit('typing-stop', { chatId, userId: user.id });
    }
  }, [socket, user]);

  return (
    <ChatContext.Provider
      value={{
        socket,
        chats,
        unreadCount,
        activeChat,
        onlineUsers,
        isConnected,
        setActiveChat,
        sendMessage,
        markAsRead,
        startTyping,
        stopTyping,
        refreshChats
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
