import { WebSocketServer } from 'ws';
import http from 'http';
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config(); // Load env variables

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('A new client connected');

  ws.on('message', async (data) => {
    console.log('Received message:', data.toString());

    try {
      const parsedData = JSON.parse(data.toString());

      if (parsedData.type === 'user_message') {
        // Fetch AI reply from Groq
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: 'llama3-70b-8192',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: parsedData.text }
          ],
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        const aiMessage = response.data.choices[0].message.content;

        // Broadcast AI response back to client
        ws.send(JSON.stringify({
          type: 'ai_message',
          text: aiMessage,
        }));
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Default to port 10000 if not set
const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log(`HiveMind Socket.IO server listening on port ${PORT}`);
});
