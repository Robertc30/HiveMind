import React, { useState, useEffect, useRef } from 'react';
import { User, Room, Message } from '../types';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import UsersList from './UsersList';
import TypingIndicator from './TypingIndicator';
import Whiteboard from './Whiteboard';
import { Copy, Users, X, Edit3, ChevronRight, ChevronLeft } from 'lucide-react';

interface ChatRoomProps {
  room: Room;
  currentUser: User;
  messages: Message[];
  users: User[];
  isAiTyping: boolean;
  typingUsers: { userId: string; isTyping: boolean }[];
  onSendMessage: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
  onLeave: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({
  room,
  currentUser,
  messages,
  users,
  isAiTyping,
  typingUsers,
  onSendMessage,
  onTyping,
  onLeave,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showWhiteboard, setShowWhiteboard] = useState(true);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(room.id);
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2000);
  };

  // Filter typing users (exclude current user)
  const filteredTypingUsers = typingUsers.filter(
    status => status.userId !== currentUser.id
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main chat area */}
      <div className={`flex flex-col flex-grow transition-all duration-300 ${showSidebar ? 'mr-80' : ''}`}>
        {/* Header */}
        <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-800">{room.name}</h1>
            <button
              onClick={() => setShowRoomInfo(!showRoomInfo)}
              className="ml-2 text-gray-500 hover:text-gray-700"
              aria-label="Room information"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="flex items-center">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="flex items-center px-3 py-1 text-sm text-purple-600 hover:text-purple-700"
              aria-label={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
            >
              {showSidebar ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
            
            <button
              onClick={onLeave}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition ml-2"
              aria-label="Leave room"
            >
              <X size={20} />
            </button>
          </div>
        </header>
        
        {/* Room info popup */}
        {showRoomInfo && (
          <div className="absolute top-16 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10 w-80">
            <h3 className="text-lg font-semibold mb-2">Room Information</h3>
            <p className="text-sm text-gray-600 mb-2">Share this code with others to join this room:</p>
            
            <div className="flex items-center mb-4">
              <code className="bg-gray-100 px-3 py-2 rounded flex-grow overflow-x-auto text-sm font-mono">
                {room.id}
              </code>
              <button 
                onClick={copyRoomId}
                className="ml-2 p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition"
                aria-label="Copy room ID"
              >
                <Copy size={18} />
              </button>
            </div>
            
            {copiedToClipboard && (
              <p className="text-sm text-green-600 animate-fade-in-out">Copied to clipboard!</p>
            )}
            
            <div className="text-xs text-gray-500 mt-2">
              <p>Created by: {currentUser.name}</p>
              <p>Active users: {users.length}</p>
            </div>
          </div>
        )}
        
        {/* Messages */}
        <div className="flex-grow overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                users={users} 
                currentUser={currentUser} 
              />
            ))}
            
            {/* Typing indicators */}
            {(filteredTypingUsers.length > 0 || isAiTyping) && (
              <TypingIndicator 
                typingUsers={filteredTypingUsers} 
                users={users} 
                isAiTyping={isAiTyping} 
              />
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Input */}
        <ChatInput onSendMessage={onSendMessage} onTyping={onTyping} />
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 flex flex-col">
          {/* Whiteboard section */}
          <div className={`flex flex-col transition-all duration-300 ${showWhiteboard ? 'h-1/2' : 'h-12'}`}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-purple-50">
              <h3 className="font-medium text-purple-900">Whiteboard</h3>
              <button
                onClick={() => setShowWhiteboard(!showWhiteboard)}
                className="text-purple-600 hover:text-purple-700"
              >
                {showWhiteboard ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
            </div>
            {showWhiteboard && (
              <div className="flex-grow relative">
                <Whiteboard embedded={true} />
              </div>
            )}
          </div>

          {/* Users section */}
          <div className="flex-grow flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-medium">Active Users ({users.length})</h3>
              <Users size={18} className="text-gray-600" />
            </div>
            <div className="flex-grow overflow-y-auto">
              <UsersList users={users} currentUser={currentUser} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;