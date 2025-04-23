import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*', // TODO: restrict in production
    methods: ['GET', 'POST'],
  },
  path: '/socket.io',
  transports: ['websocket'],
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_, res) => {
  res.status(200).send('OK');
});

io.on('connection', (socket) => {
  console.log('✅ Socket connected:', socket.id);

  socket.on('user-message', async (payload) => {
    // Groq API interaction happens here...
    console.log('🧠 Prompt received:', payload.prompt);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});

// Bind to port and 0.0.0.0 for Render
const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server live at http://0.0.0.0:${PORT}`);
});
