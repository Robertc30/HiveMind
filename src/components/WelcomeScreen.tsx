import React, { useState, KeyboardEvent } from 'react';
import { nanoid } from 'nanoid';
import { User, Room, AIModel } from '../types';
import { ChevronRight, Users, Key, Bot } from 'lucide-react';

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6366F1', // indigo
  '#0EA5E9', // sky
  '#14B8A6', // teal
  '#F97316', // orange
];

const AI_MODELS: AIModel[] = [
  { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3 70B', provider: 'Groq' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'Groq' },
];

interface WelcomeScreenProps {
  onJoin: (room: Room, user: User) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onJoin }) => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
  const [step, setStep] = useState<'name' | 'credentials' | 'room'>('name');
  const [joinType, setJoinType] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState('');
  const [showApiInfo, setShowApiInfo] = useState(false);

  const handleContinue = () => {
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }
    setError('');
    setStep('credentials');
  };

  const handleCredentialsContinue = () => {
    if (!apiKey.trim()) {
      setError('Please enter your API key');
      return;
    }
    setError('');
    setStep('room');
  };

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }
    
    const newRoomId = nanoid(10);
    const randomColorIndex = Math.floor(Math.random() * COLORS.length);
    
    onJoin(
      { id: newRoomId, name: roomName },
      { 
        name: username, 
        color: COLORS[randomColorIndex],
        apiKey,
        preferredModel: selectedModel
      }
    );
  };

  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    
    const randomColorIndex = Math.floor(Math.random() * COLORS.length);
    
    onJoin(
      { id: roomId, name: 'Joined Room' },
      { 
        name: username, 
        color: COLORS[randomColorIndex],
        apiKey,
        preferredModel: selectedModel
      }
    );
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step === 'name') {
        handleContinue();
      } else if (step === 'credentials') {
        handleCredentialsContinue();
      } else if (joinType === 'create') {
        handleCreateRoom();
      } else if (joinType === 'join') {
        handleJoinRoom();
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-50 to-white p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300">
        <div className="p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-purple-600 rounded-full p-3">
              <Users size={28} className="text-white" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Welcome to HiveMind
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Collaborate with AI and humans in real-time
          </p>
          
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          
          {step === 'name' ? (
            <>
              <div className="mb-6">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  What's your name?
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                  placeholder="Enter your name"
                  autoFocus
                />
              </div>
              
              <button
                onClick={handleContinue}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 font-medium"
              >
                Continue <ChevronRight size={18} />
              </button>
            </>
          ) : step === 'credentials' ? (
            <>
              <div className="space-y-6">
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                    Enter your Groq API key
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      id="apiKey"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                      placeholder="sk_..."
                      autoFocus
                    />
                    <Key size={16} className="absolute left-3 top-3 text-gray-400" />
                  </div>
                  <button
                    onClick={() => setShowApiInfo(!showApiInfo)}
                    className="text-purple-600 text-sm mt-2 hover:underline"
                  >
                    Need an API key?
                  </button>
                </div>

                {showApiInfo && (
                  <div className="bg-purple-50 p-4 rounded-lg text-sm">
                    <h3 className="font-medium mb-2">Get your free API key:</h3>
                    <ul className="space-y-2">
                      <li>
                        <a 
                          href="https://console.groq.com/keys" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:underline"
                        >
                          Groq Console →
                        </a>
                      </li>
                    </ul>
                  </div>
                )}

                <div>
                  <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                    Select AI Model
                  </label>
                  <div className="relative">
                    <select
                      id="model"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition appearance-none bg-white"
                    >
                      {AI_MODELS.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.provider} - {model.name}
                        </option>
                      ))}
                    </select>
                    <Bot size={16} className="absolute left-3 top-3 text-gray-400" />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setStep('name')}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCredentialsContinue}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {joinType === null ? (
                <div className="flex flex-col gap-4">
                  <button
                    onClick={() => setJoinType('create')}
                    className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition font-medium"
                  >
                    Create a new room
                  </button>
                  <button
                    onClick={() => setJoinType('join')}
                    className="w-full bg-white text-purple-600 border border-purple-600 py-3 px-4 rounded-lg hover:bg-purple-50 transition font-medium"
                  >
                    Join an existing room
                  </button>
                  <button
                    onClick={() => setStep('credentials')}
                    className="text-gray-600 text-sm hover:underline self-center mt-2"
                  >
                    Go back
                  </button>
                </div>
              ) : joinType === 'create' ? (
                <>
                  <div className="mb-6">
                    <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-1">
                      Name your room
                    </label>
                    <input
                      type="text"
                      id="roomName"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                      placeholder="Enter room name"
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setJoinType(null)}
                      className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCreateRoom}
                      className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition"
                    >
                      Create
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-1">
                      Enter room code
                    </label>
                    <input
                      type="text"
                      id="roomId"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                      placeholder="Enter room ID"
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setJoinType(null)}
                      className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleJoinRoom}
                      className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition"
                    >
                      Join
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;