import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { ChatRoom } from './pages/ChatRoom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat/:roomId" element={<ChatRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;