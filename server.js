import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

// Serve a simple homepage so Render doesn't think it's broken
app.get("/", (req, res) => {
  res.send("HiveMind backend alive! 🚀");
});

// Create a Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  socket.on('user_message', async (msg) => {
    console.log(`💬 Message received:`, msg);
    try {
      const groqResponse = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'mixtral-8x7b-32768',
          messages: [{ role: 'user', content: msg }],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const aiMessage = groqResponse.data.choices[0].message.content;
      console.log(`🤖 AI Message:`, aiMessage);
      io.emit('ai_message', aiMessage); // Broadcast to all users
    } catch (error) {
      console.error('🚨 Groq API Error:', error);
      io.emit('ai_message', 'Error processing your request.');
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`✅ WebSocket server running on http://localhost:${PORT}`);
});
