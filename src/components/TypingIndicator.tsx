import React from 'react';
import { User } from '../types';
import { BrainCircuit } from 'lucide-react';

interface TypingIndicatorProps {
  typingUsers: { userId: string; isTyping: boolean }[];
  users: User[];
  isAiTyping: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers, users, isAiTyping }) => {
  // Find user objects for the typing users
  const typingUserObjects = typingUsers
    .map(({ userId }) => users.find(user => user.id === userId))
    .filter(Boolean) as User[];
  
  // Nothing to render if no one is typing
  if (typingUserObjects.length === 0 && !isAiTyping) return null;
  
  // Get typing message
  const getTypingMessage = () => {
    if (isAiTyping) {
      return 'HiveMind AI is typing...';
    } else if (typingUserObjects.length === 1) {
      return `${typingUserObjects[0].name} is typing...`;
    } else if (typingUserObjects.length === 2) {
      return `${typingUserObjects[0].name} and ${typingUserObjects[1].name} are typing...`;
    } else {
      return 'Several people are typing...';
    }
  };
  
  return (
    <div className="flex items-center gap-2 mb-4 ml-2 text-gray-500 text-sm">
      {isAiTyping ? (
        <div className="flex-shrink-0 h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
          <BrainCircuit size={16} className="text-purple-600" />
        </div>
      ) : (
        <div 
          className="flex-shrink-0 h-8 w-8 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: typingUserObjects[0]?.color || '#64748B' }}
        >
          <span 
            className="text-xs font-medium"
            style={{ color: typingUserObjects[0]?.color || '#64748B' }}
          >
            {typingUserObjects[0]?.name.substring(0, 2).toUpperCase() || '?'}
          </span>
        </div>
      )}
      
      <div className="flex items-center gap-1">
        <span>{getTypingMessage()}</span>
        <span className="flex">
          <span className="dot w-1 h-1 bg-gray-500 rounded-full mx-0.5 animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="dot w-1 h-1 bg-gray-500 rounded-full mx-0.5 animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="dot w-1 h-1 bg-gray-500 rounded-full mx-0.5 animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </span>
      </div>
    </div>
  );
};

export default TypingIndicator;