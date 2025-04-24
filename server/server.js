import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { createViteServer } from 'vite';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  app.use(vite.middlewares);
  app.use(cors());
  app.use(express.json());

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    path: "/socket.io",
    transports: ["websocket", "polling"]
  });

  app.get("/health", (_, res) => res.status(200).send("OK"));

  io.on("connection", socket => {
    console.log("New client connected:", socket.id);
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () =>
    console.log(`Server running on port ${PORT}`)
  );
}

startServer();
