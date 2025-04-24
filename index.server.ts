import express from 'express';
import { createServer as createViteServer } from 'vite';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  app.use(vite.middlewares);
  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'dist')));

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    path: '/socket.io',
    transports: ['websocket', 'polling']
  });

  app.get('/health', (_, res) => res.status(200).send('OK'));

  io.on('connection', socket => {
    console.log('New client connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  httpServer.listen(PORT, () =>
    console.log(`Server running on port ${PORT}`)
  );
}

startServer();
