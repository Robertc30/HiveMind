# HiveMind: Collaborative AI Chat Platform

HiveMind is a real-time collaborative chat platform that enables teams to brainstorm and develop ideas together with the help of AI. Each user can connect with their own API key, ensuring privacy and control over their AI usage.

![HiveMind Screenshot](https://images.pexels.com/photos/7014766/pexels-photo-7014766.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2)

## Features

- 🤝 Real-time collaboration with multiple users
- 🧠 AI-powered responses using Groq's advanced language models
- ✏️ Interactive whiteboard for visual collaboration
- 🔐 Bring your own API key for privacy and control
- 🎨 Beautiful, responsive UI with dark mode support
- 🚀 Built with modern web technologies

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/hivemind-chat.git
cd hivemind-chat
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
# Optional: Default API key for development
GROQ_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Environment Variables

- `GROQ_API_KEY` (optional) - Your Groq API key for development
- `PORT` (optional) - Port for the WebSocket server (default: 3000)

## Technologies Used

- React 18 with TypeScript
- Socket.IO for real-time communication
- Groq API for AI responses
- Tailwind CSS for styling
- Perfect Freehand for whiteboard drawing

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.