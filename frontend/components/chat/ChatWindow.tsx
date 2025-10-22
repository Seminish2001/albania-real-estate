'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, User, Home } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { Chat } from '../../types';

interface ChatWindowProps {
  chat: Chat;
}

export default function ChatWindow({ chat }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { sendMessage, startTyping, stopTyping, markAsRead } = useChat();
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages]);

  useEffect(() => {
    if (chat.id) {
      markAsRead(chat.id);
    }
  }, [chat.id, markAsRead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (message.trim()) {
      await sendMessage(message.trim());
      setMessage('');
      stopTyping(chat.id);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    if (value.trim()) {
      if (!isTyping) {
        setIsTyping(true);
        startTyping(chat.id);
      }
    } else {
      if (isTyping) {
        setIsTyping(false);
        stopTyping(chat.id);
      }
    }
  };

  useEffect(() => {
    if (!message.trim() && isTyping) {
      setIsTyping(false);
    }
  }, [isTyping, message]);

  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('sq-AL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOwnMessage = (senderId: string) => senderId === user?.id;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-3">
          {chat.otherUserAvatar ? (
            <img
              src={chat.otherUserAvatar}
              alt={chat.otherUserName || 'Chat participant'}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-primary-600" />
            </div>
          )}

          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              {chat.otherUserName || 'Unknown user'}
              {chat.otherUserAgency && (
                <span className="text-sm text-gray-500 ml-1">• {chat.otherUserAgency}</span>
              )}
            </h3>

            {chat.propertyTitle && (
              <div className="flex items-center text-sm text-gray-600">
                <Home className="h-3 w-3 mr-1" />
                <span>{chat.propertyTitle}</span>
              </div>
            )}
          </div>

          <div className="text-sm text-gray-500">{isTyping && 'typing...'}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {chat.messages?.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${isOwnMessage(msg.senderId) ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                isOwnMessage(msg.senderId)
                  ? 'bg-primary-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-900 rounded-bl-none'
              }`}
            >
              <p className="text-sm break-words">{msg.content}</p>
              <div
                className={`text-xs mt-1 ${
                  isOwnMessage(msg.senderId) ? 'text-primary-200' : 'text-gray-500'
                }`}
              >
                {formatMessageTime(msg.createdAt)}
                {isOwnMessage(msg.senderId) && (
                  <span className="ml-2">{msg.read ? 'Read' : 'Delivered'}</span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <div className="flex-1">
            <input
              type="text"
              value={message}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="input-primary w-full"
            />
          </div>

          <button
            type="submit"
            disabled={!message.trim()}
            className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
