import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  path: "/socket.io",
  transports: ["websocket", "polling"]
});

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.status(200).send("OK"));

io.on("connection", socket => {
  console.log("New client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
