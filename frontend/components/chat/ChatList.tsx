'use client';

import { MessageSquare, User, Home } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { Chat } from '../../types';

interface ChatListProps {
  onSelectChat: (chat: Chat) => void;
}

export default function ChatList({ onSelectChat }: ChatListProps) {
  const { chats, activeChat } = useChat();

  const formatLastMessage = (message?: string | null) => {
    if (!message) return 'No messages yet';
    return message.length > 50 ? `${message.substring(0, 50)}...` : message;
  };

  const formatTime = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' });
    }

    if (diffInHours < 168) {
      return date.toLocaleDateString('sq-AL', { weekday: 'short' });
    }

    return date.toLocaleDateString('sq-AL', { month: 'short', day: 'numeric' });
  };

  if (chats.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No conversations yet</p>
        <p className="text-sm">Start a chat from a property listing</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chats.map((chat) => (
        <button
          key={chat.id}
          onClick={() => onSelectChat(chat)}
          className={`w-full text-left p-4 rounded-lg transition-colors ${
            activeChat?.id === chat.id
              ? 'bg-primary-100 border border-primary-300'
              : 'hover:bg-gray-50 border border-transparent'
          }`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {chat.otherUserAvatar ? (
                <img
                  src={chat.otherUserAvatar}
                  alt={chat.otherUserName || 'Chat participant'}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary-600" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900 truncate">
                  {chat.otherUserName || 'Unknown user'}
                  {chat.otherUserAgency && (
                    <span className="text-sm text-gray-500 ml-1">
                      • {chat.otherUserAgency}
                    </span>
                  )}
                </h3>
                {chat.lastMessageAt && (
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatTime(chat.lastMessageAt)}
                  </span>
                )}
              </div>

              {chat.propertyTitle && (
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <Home className="h-3 w-3 mr-1" />
                  <span className="truncate">{chat.propertyTitle}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 truncate">
                  {formatLastMessage(chat.lastMessage)}
                </p>
                {chat.unreadCount && chat.unreadCount > 0 && (
                  <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center flex-shrink-0 ml-2">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
