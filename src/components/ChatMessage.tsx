import React from 'react';
import { Message, User } from '../types';
import { BrainCircuit } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  users: User[];
  currentUser: User;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, users, currentUser }) => {
  const isCurrentUser = message.sender !== 'ai' && message.sender === currentUser.id;
  const isAI = message.sender === 'ai';
  
  // Find message sender in users list
  const messageSender = isAI 
    ? { name: 'HiveMind AI', color: '#7C3AED' } 
    : users.find(user => user.id === message.sender) || { name: message.senderName, color: '#64748B' };
  
  const messageDate = new Date(message.timestamp);
  const timeString = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <div
      className={`mb-4 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
      data-message-id={message.id}
    >
      <div className={`flex max-w-[85%] md:max-w-[70%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${isAI ? 'bg-purple-600' : 'bg-white border-2'}`} 
          style={{ borderColor: isAI ? '#7C3AED' : messageSender.color }}>
          {isAI ? (
            <BrainCircuit size={18} className="text-white" />
          ) : (
            <span className="text-sm font-medium" style={{ color: messageSender.color }}>
              {(messageSender.name || "").substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        
        {/* Message content */}
        <div className={`mx-2 ${isCurrentUser ? 'mr-2' : 'ml-2'}`}>
          {/* Sender name */}
          <div className={`text-xs mb-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
            <span className="font-medium" style={{ color: messageSender.color }}>
              {messageSender.name}
            </span>
            <span className="text-gray-500 ml-2">{timeString}</span>
          </div>
          
          {/* Message bubble */}
          <div 
            className={`py-2 px-3 rounded-lg ${
              isAI 
                ? 'bg-purple-50 border border-purple-200 text-gray-800' 
                : isCurrentUser 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-800'
            }`}
          >
            <p className="whitespace-pre-wrap break-words text-sm md:text-base">
              {message.text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
