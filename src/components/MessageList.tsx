import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Message } from '../types';

interface MessageListProps {
  messages: Message[];
  showTimestamps?: boolean;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit'
  });
}

export function MessageList({ messages, showTimestamps = false }: MessageListProps) {
  const messageEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex items-start gap-3 ${
            message.user === 'GPT' ? 'bg-blue-50 rounded-lg p-3' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <div className="font-medium text-sm text-gray-900">{message.user}</div>
              {showTimestamps && (
                <div className="text-xs text-gray-500">
                  {formatTime(message.timestamp)}
                </div>
              )}
            </div>
            <div className="mt-1 text-gray-700">{message.content}</div>
          </div>
        </div>
      ))}
      <div ref={messageEndRef} />
    </div>
  );
}