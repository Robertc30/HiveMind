import { WebSocketServer } from 'ws';
import http from 'http';

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', function connection(ws) {
  console.log('A new client connected');
  
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);

    // Echo the message to all connected clients
    wss.clients.forEach(function each(client) {
      if (client.readyState === ws.OPEN) {
        client.send(message);
      }
    });
  });

  ws.send('Welcome to HiveMind!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
  console.log(`HiveMind WebSocket server is listening on port ${PORT}`);
});
