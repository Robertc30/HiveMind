import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { isValidUUID } from '../types/index';

export function Home() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleCreateRoom = () => {
    const newRoomId = crypto.randomUUID();
    navigate(`/chat/${newRoomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (roomId.trim()) {
      if (!isValidUUID(roomId)) {
        setError('Please enter a valid room ID');
        return;
      }
      navigate(`/chat/${roomId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Shared Chat Room</h2>
          <p className="mt-2 text-sm text-gray-600">Create a new room or join an existing one</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleCreateRoom}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create New Room
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or join existing</span>
            </div>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-3">
            <div className="space-y-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter Room ID"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Join Room
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}