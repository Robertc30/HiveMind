import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:4173"],
    methods: ["GET", "POST"]
  }
});

// Store active users and messages
const rooms = new Map();

// Generate AI response using Groq API
const generateAIResponse = async (message, roomHistory, userApiKey, model) => {
  try {
    console.log('Generating AI response for message:', message);
    
    // Filter out system messages and format history
    const formattedHistory = roomHistory
      .filter(msg => msg.sender !== 'system')
      .map(msg => ({
        role: msg.sender === 'ai' ? 'assistant' : 'user',
        content: msg.text
      }));

    const requestBody = {
      model: model || "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are HiveMind AI, a collaborative AI assistant helping a group brainstorm and develop ideas together. Be concise, insightful, and focus on building upon users' ideas constructively. Keep responses under 3 sentences when possible."
        },
        ...formattedHistory,
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 800,
      top_p: 1,
      stream: false
    };

    console.log('Sending request to Groq API with body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Groq API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Received response from Groq API:', JSON.stringify(data, null, 2));
    
    if (!data?.choices?.[0]?.message?.content) {
      console.error('Invalid API response structure:', data);
      throw new Error('Invalid API response structure');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
};

// Initialize room if it doesn't exist
function initializeRoom(roomId) {
  if (!rooms.has(roomId)) {
    console.log('Creating new room:', roomId);
    rooms.set(roomId, {
      users: new Map(),
      messages: []
    });
  }
  return rooms.get(roomId);
}

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  let currentRoom = null;
  let userData = null;

  socket.on('join_room', async ({ roomId, user }) => {
    console.log('User joining room:', { roomId, user });
    
    // Leave previous room if any
    if (currentRoom) {
      const prevRoom = rooms.get(currentRoom);
      if (prevRoom) {
        prevRoom.users.delete(socket.id);
        io.to(currentRoom).emit('user_left', { userId: socket.id });
      }
      socket.leave(currentRoom);
    }

    // Join new room
    currentRoom = roomId;
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    const room = initializeRoom(roomId);
    
    // Store user data including API key and preferred model
    userData = { 
      ...user, 
      id: socket.id,
      apiKey: user.apiKey,
      preferredModel: user.preferredModel
    };
    
    // Remove sensitive data before storing in room
    const publicUserData = {
      ...userData,
      apiKey: undefined,
      preferredModel: undefined
    };
    room.users.set(socket.id, publicUserData);
    
    // Send room history to the new user
    socket.emit('room_history', {
      messages: room.messages,
      users: Array.from(room.users.entries()).map(([id, user]) => ({ id, ...user }))
    });
    
    // Notify others that user joined (without sensitive data)
    socket.to(roomId).emit('user_joined', publicUserData);
    
    // Send welcome message
    const welcomeMessage = {
      id: Date.now().toString(),
      sender: 'ai',
      senderName: 'HiveMind AI',
      text: `Welcome to the room, ${user.name}! I'm here to help with your brainstorming session.`,
      timestamp: new Date().toISOString()
    };
    
    room.messages.push(welcomeMessage);
    io.to(roomId).emit('message', welcomeMessage);
  });

  socket.on('message', async ({ text }) => {
    if (!currentRoom || !userData) {
      console.log('Message received but no room or user data:', { currentRoom, userData });
      return;
    }
    
    const room = rooms.get(currentRoom);
    if (!room) {
      console.log('Room not found:', currentRoom);
      return;
    }
    
    // Add user message to history
    const userMessage = {
      id: Date.now().toString(),
      sender: socket.id,
      senderName: userData.name,
      text,
      timestamp: new Date().toISOString()
    };
    
    room.messages.push(userMessage);
    io.to(currentRoom).emit('message', userMessage);
    
    // Signal AI is typing
    io.to(currentRoom).emit('ai_typing', true);
    
    // Generate AI response using user's API key and preferred model
    try {
      const aiResponse = await generateAIResponse(
        text, 
        room.messages, 
        userData.apiKey,
        userData.preferredModel
      );
      
      // Add AI message to history
      const aiMessage = {
        id: Date.now().toString(),
        sender: 'ai',
        senderName: 'HiveMind AI',
        text: aiResponse,
        timestamp: new Date().toISOString()
      };
      
      room.messages.push(aiMessage);
      io.to(currentRoom).emit('message', aiMessage);
    } catch (error) {
      console.error('Error in message handler:', error);
      
      // Send error message to room
      const errorMessage = {
        id: Date.now().toString(),
        sender: 'ai',
        senderName: 'HiveMind AI',
        text: "I apologize, but I encountered an error while processing your message. Please verify your API key and try again.",
        timestamp: new Date().toISOString()
      };
      
      room.messages.push(errorMessage);
      io.to(currentRoom).emit('message', errorMessage);
    } finally {
      io.to(currentRoom).emit('ai_typing', false);
    }
  });

  socket.on('typing', (isTyping) => {
    if (!currentRoom || !userData) return;
    socket.to(currentRoom).emit('user_typing', { userId: socket.id, isTyping });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (!currentRoom) return;
    
    const room = rooms.get(currentRoom);
    if (room) {
      room.users.delete(socket.id);
      io.to(currentRoom).emit('user_left', { userId: socket.id });
      
      // Clean up empty rooms
      if (room.users.size === 0) {
        console.log('Removing empty room:', currentRoom);
        rooms.delete(currentRoom);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});