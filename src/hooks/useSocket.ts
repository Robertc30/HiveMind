import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { User, Message, UserTypingStatus } from '../types';

// Connect to the same origin since we're using Vite proxy
const SERVER_URL = '/';

export const useSocket = () => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<UserTypingStatus[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SERVER_URL, {
      path: "/socket.io",
      transports: ["websocket"],
      reconnection: true,
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      reconnectAttempts.current = 0;
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      reconnectAttempts.current += 1;
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        socket.disconnect();
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        socket.connect();
      }
    });

    socket.on('room_history', ({ messages, users }) => {
      console.log('Received room history:', { messageCount: messages.length, userCount: users.length });
      setMessages(messages);
      setUsers(users);
    });

    socket.on('message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('user_joined', (user: User) => {
      console.log('User joined:', user);
      setUsers((prev) => [...prev, { ...user, id: user.id }]);
    });

    socket.on('user_left', ({ userId }) => {
      console.log('User left:', userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      setTypingUsers((prev) => prev.filter((status) => status.userId !== userId));
    });

    socket.on('user_typing', ({ userId, isTyping }: UserTypingStatus) => {
      setTypingUsers((prev) => {
        const existingIndex = prev.findIndex((status) => status.userId === userId);
        if (existingIndex >= 0) {
          if (!isTyping) {
            return prev.filter((status) => status.userId !== userId);
          }
          return prev;
        } else if (isTyping) {
          return [...prev, { userId, isTyping }];
        }
        return prev;
      });
    });

    socket.on('ai_typing', (isTyping: boolean) => {
      setIsAiTyping(isTyping);
    });

    return () => {
      console.log('Cleaning up socket connection');
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback((roomId: string, user: User) => {
    if (!socketRef.current?.connected) {
      console.log('Socket not connected, attempting to connect...');
      socketRef.current?.connect();
    }
    
    console.log('Joining room:', roomId, user);
    socketRef.current?.emit('join_room', { roomId, user });
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message', { text });
    } else {
      console.error('Cannot send message: socket not connected');
    }
  }, []);

  const setTyping = useCallback((isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', isTyping);
    }
  }, []);

  return {
    connected,
    messages,
    users,
    typingUsers,
    isAiTyping,
    joinRoom,
    sendMessage,
    setTyping,
  };
};
