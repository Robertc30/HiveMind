import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import type { Message, ChatRoom } from '../types';

const chatRooms = new Map<string, ChatRoom>();

const generateUsername = () => {
  const adjectives = ["Swift", "Loud", "Silent", "Witty", "Clever", "Bright", "Wise", "Quick"];
  const animals = ["Tiger", "Falcon", "Panther", "Otter", "Wolf", "Eagle", "Bear", "Fox"];
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${animals[Math.floor(Math.random() * animals.length)]}`;
};

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username] = React.useState(generateUsername);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [users] = React.useState(new Set([username]));

  React.useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    if (!chatRooms.has(roomId)) {
      chatRooms.set(roomId, { id: roomId, messages: [] });
    }

    setMessages(chatRooms.get(roomId)!.messages);
  }, [roomId, navigate]);

  const handleSendMessage = async (content: string) => {
    setError(null);
    const newMessage: Message = {
      id: nanoid(),
      user: username,
      content,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    chatRooms.get(roomId!)!.messages = updatedMessages;

    setIsLoading(true);
    try {
      const gptContent = await getGPTResponse(updatedMessages);
      const gptResponse: Message = {
        id: nanoid(),
        user: 'GPT',
        content: gptContent,
        timestamp: Date.now(),
      };

      const withGptResponse = [...updatedMessages, gptResponse];
      setMessages(withGptResponse);
      chatRooms.get(roomId!)!.messages = withGptResponse;
    } catch (error) {
      console.error('Error getting GPT response:', error);
      setError('Failed to get GPT response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = () => {
    navigate('/');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Chat Room: {roomId}</h1>
              <p className="text-sm text-gray-500">Joined as: {username}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy Room Link
                {copied && <span className="text-green-600 ml-2">Copied!</span>}
              </button>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showTimestamps}
                  onChange={(e) => setShowTimestamps(e.target.checked)}
                  className="rounded text-blue-500 focus:ring-blue-500"
                />
                Show Timestamps
              </label>
              <button
                onClick={handleLeaveRoom}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Leave Room
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>Users in room:</span>
            <div className="flex gap-2">
              {Array.from(users).map((user) => (
                <span
                  key={user}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                >
                  {user}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full bg-white shadow-lg rounded-lg my-4 overflow-hidden">
        <MessageList messages={messages} showTimestamps={showTimestamps} />
        <ChatInput onSendMessage={handleSendMessage} />
        {isLoading && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm">
            GPT is thinking...
          </div>
        )}
        {error && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full text-sm">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}