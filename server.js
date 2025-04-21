import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";

const app = express();
const httpServer = createServer(app);

// Serve a simple homepage so Render doesn't think it's broken
app.get("/", (req, res) => {
  res.send("HiveMind backend server is alive 🚀");
});

// Create a Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("message", (msg) => {
    console.log("message received: ", msg);
    io.emit("message", msg); // broadcast
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
