import { WebSocketServer } from 'ws';
import http from 'http';
import express from 'express';

const app = express();
const server = http.createServer(app); // Create a raw HTTP server
const wss = new WebSocketServer({ server }); // Attach WS server to the HTTP server

wss.on('connection', (socket) => {
  console.log('Client connected via WebSocket');

  socket.on('message', (message) => {
    console.log(`Received: ${message}`);
    // Broadcast to all clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  socket.on('close', () => {
    console.log('Client disconnected');
  });
});

// Must listen like this
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`HiveMind WebSocket server listening on port ${PORT}`);
});
