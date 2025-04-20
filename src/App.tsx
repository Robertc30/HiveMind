import React, { useState } from 'react';
import { User, Room } from './types';
import { useSocket } from './hooks/useSocket';
import WelcomeScreen from './components/WelcomeScreen';
import ChatRoom from './components/ChatRoom';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  
  const {
    connected,
    messages,
    users,
    typingUsers,
    isAiTyping,
    joinRoom,
    sendMessage,
    setTyping,
  } = useSocket();
  
  const handleJoinRoom = (room: Room, user: User) => {
    setCurrentUser(user);
    setCurrentRoom(room);
    joinRoom(room.id, user);
  };
  
  const handleLeaveRoom = () => {
    setCurrentUser(null);
    setCurrentRoom(null);
  };
  
  // Show welcome screen if not in a room
  if (!currentUser || !currentRoom) {
    return <WelcomeScreen onJoin={handleJoinRoom} />;
  }
  
  // Show connecting message while socket initializes
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4"></div>
        <p className="text-gray-700">Connecting to HiveMind...</p>
      </div>
    );
  }
  
  // Show chat room
  return (
    <ChatRoom
      room={currentRoom}
      currentUser={currentUser}
      messages={messages}
      users={users}
      isAiTyping={isAiTyping}
      typingUsers={typingUsers}
      onSendMessage={sendMessage}
      onTyping={setTyping}
      onLeave={handleLeaveRoom}
    />
  );
}

export default App;