import { WebSocketServer } from 'ws';
import http from 'http';
import express from 'express';
import fetch from 'node-fetch'; // ⚡ Make sure node-fetch is installed

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 10000;

// 🌟 Your Groq API KEY (load from environment in real app)
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Helper to ask Groq AI
async function fetchGroqResponse(userMessage) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3-70b-8192', // or your selected model
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't think of anything.";
}

wss.on('connection', (socket) => {
  console.log('A client connected');

  socket.on('message', async (rawData) => {
    let message;
    try {
      message = JSON.parse(rawData);
    } catch (error) {
      console.error('Invalid message format:', rawData);
      return;
    }

    console.log('Received:', message);

    // 🔥 Broadcast the original user's message
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });

    // 🧠 If it's NOT the AI talking, summon Groq AI!
    if (message.sender !== 'HiveMind AI') {
      try {
        const aiReply = await fetchGroqResponse(message.text);

        const aiMessage = {
          sender: 'HiveMind AI',
          text: aiReply,
          timestamp: Date.now(),
          roomId: message.roomId,
        };

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(aiMessage));
          }
        });

      } catch (error) {
        console.error('Failed to fetch AI reply:', error);
      }
    }
  });

  socket.on('close', () => {
    console.log('A client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`HiveMind WebSocket server is listening on port ${PORT}`);
});
