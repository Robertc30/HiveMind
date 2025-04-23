console.log("🔥🔥🔥 BACKEND IS LIVE 🔥🔥🔥");
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => res.send("HiveMind backend OK 🚀"));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  path: '/socket.io',
});

io.on("connection", (socket) => {
  console.log("🟢 New client:", socket.id);

  socket.on("user_message", async (msg) => {
    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama3-8b-8192",
          messages: [{ role: "user", content: msg }]
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
      socket.emit("ai_message", { text: response.data.choices[0].message.content });
    } catch (err) {
      console.error("Groq error:", err.message);
      socket.emit("ai_message", { text: "Error from AI." });
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on http://0.0.0.0:${PORT}`);
});
