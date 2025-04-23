import http from 'http';
import express from 'express';
import { Server } from "socket.io";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get("/health", (_, res) => res.send("HiveMind backend is running"));

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });
});

server.listen(process.env.PORT || 10000, () => {
  console.log('listening on *:10000');
});
