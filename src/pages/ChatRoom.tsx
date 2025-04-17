import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom(); // if you have this already set up
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Initialize username
  React.useEffect(() => {
    getOrCreateUser()
      .then(username => {
        setUsername(username);
        setActiveUsers(new Set([username]));
      })
      .catch(error => {
        console.error('Error getting username:', error);
        setError('Failed to initialize user. Please refresh the page.');
      });
  }, []);

  React.useEffect(() => {
    if (!roomId || !username || !isValidUUID(roomId)) {
      return;
    }

    const updatePresence = async () => {
      try {
        const presenceId = crypto.randomUUID();
        await supabase.from('presence').upsert({
          id: presenceId,
          room_id: roomId,
          username,
          last_seen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const { data } = await supabase
          .from('presence')
          .select('username')
          .eq('room_id', roomId)
          .gte('last_seen', new Date(Date.now() - PRESENCE_TIMEOUT).toISOString());

        if (data) {
          setActiveUsers(new Set([...data.map(u => u.username), username]));
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const formattedMessages: Message[] = (data || []).map((msg: SupabaseMessage) => ({
          id: msg.id,
          user: msg.username,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
        }));

        setMessages(formattedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please refresh the page.');
      }
    };

    // Initialize
    updatePresence();
    fetchActiveUsers();
    fetchMessages();

    // Set up real-time subscriptions
    const messageChannel = supabase.channel('messages');
    const presenceChannel = supabase.channel('presence');

    messageChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as SupabaseMessage;
          setMessages((prev) => {
            const newMessages = [...prev];
            const exists = newMessages.some(msg => msg.id === newMessage.id);
            if (!exists) {
              newMessages.push({
                id: newMessage.id,
                user: newMessage.username,
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at).getTime(),
              });
              newMessages.sort((a, b) => a.timestamp - b.timestamp);
            }
            return newMessages;
          });
          scrollToBottom();
        }
      )
      .subscribe();
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom(); // if you have this already set up
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Initialize username
  React.useEffect(() => {
    getOrCreateUser()
      .then(username => {
        setUsername(username);
        setActiveUsers(new Set([username]));
      })
      .catch(error => {
        console.error('Error getting username:', error);
        setError('Failed to initialize user. Please refresh the page.');
      });
  }, []);

  React.useEffect(() => {
    if (!roomId || !username || !isValidUUID(roomId)) {
      return;
    }

    const updatePresence = async () => {
      try {
        const presenceId = crypto.randomUUID();
        await supabase.from('presence').upsert({
          id: presenceId,
          room_id: roomId,
          username,
          last_seen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const { data } = await supabase
          .from('presence')
          .select('username')
          .eq('room_id', roomId)
          .gte('last_seen', new Date(Date.now() - PRESENCE_TIMEOUT).toISOString());

        if (data) {
          setActiveUsers(new Set([...data.map(u => u.username), username]));
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const formattedMessages: Message[] = (data || []).map((msg: SupabaseMessage) => ({
          id: msg.id,
          user: msg.username,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
        }));

        setMessages(formattedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please refresh the page.');
      }
    };

    // Initialize
    updatePresence();
    fetchActiveUsers();
    fetchMessages();

    // Set up real-time subscriptions
    const messageChannel = supabase.channel('messages');
    const presenceChannel = supabase.channel('presence');

    messageChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as SupabaseMessage;
          setMessages((prev) => {
            const newMessages = [...prev];
            const exists = newMessages.some(msg => msg.id === newMessage.id);
            if (!exists) {
              newMessages.push({
                id: newMessage.id,
                user: newMessage.username,
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at).getTime(),
              });
              newMessages.sort((a, b) => a.timestamp - b.timestamp);
            }
            return newMessages;
          });
          scrollToBottom();
        }
      )
      .subscribe();
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom(); // if you have this already set up
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Initialize username
  React.useEffect(() => {
    getOrCreateUser()
      .then(username => {
        setUsername(username);
        setActiveUsers(new Set([username]));
      })
      .catch(error => {
        console.error('Error getting username:', error);
        setError('Failed to initialize user. Please refresh the page.');
      });
  }, []);

  React.useEffect(() => {
    if (!roomId || !username || !isValidUUID(roomId)) {
      return;
    }

    const updatePresence = async () => {
      try {
        const presenceId = crypto.randomUUID();
        await supabase.from('presence').upsert({
          id: presenceId,
          room_id: roomId,
          username,
          last_seen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const { data } = await supabase
          .from('presence')
          .select('username')
          .eq('room_id', roomId)
          .gte('last_seen', new Date(Date.now() - PRESENCE_TIMEOUT).toISOString());

        if (data) {
          setActiveUsers(new Set([...data.map(u => u.username), username]));
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const formattedMessages: Message[] = (data || []).map((msg: SupabaseMessage) => ({
          id: msg.id,
          user: msg.username,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
        }));

        setMessages(formattedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please refresh the page.');
      }
    };

    // Initialize
    updatePresence();
    fetchActiveUsers();
    fetchMessages();

    // Set up real-time subscriptions
    const messageChannel = supabase.channel('messages');
    const presenceChannel = supabase.channel('presence');

    messageChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as SupabaseMessage;
          setMessages((prev) => {
            const newMessages = [...prev];
            const exists = newMessages.some(msg => msg.id === newMessage.id);
            if (!exists) {
              newMessages.push({
                id: newMessage.id,
                user: newMessage.username,
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at).getTime(),
              });
              newMessages.sort((a, b) => a.timestamp - b.timestamp);
            }
            return newMessages;
          });
          scrollToBottom();
        }
      )
      .subscribe();
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom(); // if you have this already set up
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Initialize username
  React.useEffect(() => {
    getOrCreateUser()
      .then(username => {
        setUsername(username);
        setActiveUsers(new Set([username]));
      })
      .catch(error => {
        console.error('Error getting username:', error);
        setError('Failed to initialize user. Please refresh the page.');
      });
  }, []);

  React.useEffect(() => {
    if (!roomId || !username || !isValidUUID(roomId)) {
      return;
    }

    const updatePresence = async () => {
      try {
        const presenceId = crypto.randomUUID();
        await supabase.from('presence').upsert({
          id: presenceId,
          room_id: roomId,
          username,
          last_seen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const { data } = await supabase
          .from('presence')
          .select('username')
          .eq('room_id', roomId)
          .gte('last_seen', new Date(Date.now() - PRESENCE_TIMEOUT).toISOString());

        if (data) {
          setActiveUsers(new Set([...data.map(u => u.username), username]));
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const formattedMessages: Message[] = (data || []).map((msg: SupabaseMessage) => ({
          id: msg.id,
          user: msg.username,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
        }));

        setMessages(formattedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please refresh the page.');
      }
    };

    // Initialize
    updatePresence();
    fetchActiveUsers();
    fetchMessages();

    // Set up real-time subscriptions
    const messageChannel = supabase.channel('messages');
    const presenceChannel = supabase.channel('presence');

    messageChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as SupabaseMessage;
          setMessages((prev) => {
            const newMessages = [...prev];
            const exists = newMessages.some(msg => msg.id === newMessage.id);
            if (!exists) {
              newMessages.push({
                id: newMessage.id,
                user: newMessage.username,
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at).getTime(),
              });
              newMessages.sort((a, b) => a.timestamp - b.timestamp);
            }
            return newMessages;
          });
          scrollToBottom();
        }
      )
      .subscribe();
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom(); // if you have this already set up
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Initialize username
  React.useEffect(() => {
    getOrCreateUser()
      .then(username => {
        setUsername(username);
        setActiveUsers(new Set([username]));
      })
      .catch(error => {
        console.error('Error getting username:', error);
        setError('Failed to initialize user. Please refresh the page.');
      });
  }, []);

  React.useEffect(() => {
    if (!roomId || !username || !isValidUUID(roomId)) {
      return;
    }

    const updatePresence = async () => {
      try {
        const presenceId = crypto.randomUUID();
        await supabase.from('presence').upsert({
          id: presenceId,
          room_id: roomId,
          username,
          last_seen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const { data } = await supabase
          .from('presence')
          .select('username')
          .eq('room_id', roomId)
          .gte('last_seen', new Date(Date.now() - PRESENCE_TIMEOUT).toISOString());

        if (data) {
          setActiveUsers(new Set([...data.map(u => u.username), username]));
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const formattedMessages: Message[] = (data || []).map((msg: SupabaseMessage) => ({
          id: msg.id,
          user: msg.username,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
        }));

        setMessages(formattedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please refresh the page.');
      }
    };

    // Initialize
    updatePresence();
    fetchActiveUsers();
    fetchMessages();

    // Set up real-time subscriptions
    const messageChannel = supabase.channel('messages');
    const presenceChannel = supabase.channel('presence');

    messageChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as SupabaseMessage;
          setMessages((prev) => {
            const newMessages = [...prev];
            const exists = newMessages.some(msg => msg.id === newMessage.id);
            if (!exists) {
              newMessages.push({
                id: newMessage.id,
                user: newMessage.username,
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at).getTime(),
              });
              newMessages.sort((a, b) => a.timestamp - b.timestamp);
            }
            return newMessages;
          });
          scrollToBottom();
        }
      )
      .subscribe();
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom(); // if you have this already set up
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Initialize username
  React.useEffect(() => {
    getOrCreateUser()
      .then(username => {
        setUsername(username);
        setActiveUsers(new Set([username]));
      })
      .catch(error => {
        console.error('Error getting username:', error);
        setError('Failed to initialize user. Please refresh the page.');
      });
  }, []);

  React.useEffect(() => {
    if (!roomId || !username || !isValidUUID(roomId)) {
      return;
    }

    const updatePresence = async () => {
      try {
        const presenceId = crypto.randomUUID();
        await supabase.from('presence').upsert({
          id: presenceId,
          room_id: roomId,
          username,
          last_seen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const { data } = await supabase
          .from('presence')
          .select('username')
          .eq('room_id', roomId)
          .gte('last_seen', new Date(Date.now() - PRESENCE_TIMEOUT).toISOString());

        if (data) {
          setActiveUsers(new Set([...data.map(u => u.username), username]));
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const formattedMessages: Message[] = (data || []).map((msg: SupabaseMessage) => ({
          id: msg.id,
          user: msg.username,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
        }));

        setMessages(formattedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please refresh the page.');
      }
    };

    // Initialize
    updatePresence();
    fetchActiveUsers();
    fetchMessages();

    // Set up real-time subscriptions
    const messageChannel = supabase.channel('messages');
    const presenceChannel = supabase.channel('presence');

    messageChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as SupabaseMessage;
          setMessages((prev) => {
            const newMessages = [...prev];
            const exists = newMessages.some(msg => msg.id === newMessage.id);
            if (!exists) {
              newMessages.push({
                id: newMessage.id,
                user: newMessage.username,
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at).getTime(),
              });
              newMessages.sort((a, b) => a.timestamp - b.timestamp);
            }
            return newMessages;
          });
          scrollToBottom();
        }
      )
      .subscribe();
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom(); // if you have this already set up
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Initialize username
  React.useEffect(() => {
    getOrCreateUser()
      .then(username => {
        setUsername(username);
        setActiveUsers(new Set([username]));
      })
      .catch(error => {
        console.error('Error getting username:', error);
        setError('Failed to initialize user. Please refresh the page.');
      });
  }, []);

  React.useEffect(() => {
    if (!roomId || !username || !isValidUUID(roomId)) {
      return;
    }

    const updatePresence = async () => {
      try {
        const presenceId = crypto.randomUUID();
        await supabase.from('presence').upsert({
          id: presenceId,
          room_id: roomId,
          username,
          last_seen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const { data } = await supabase
          .from('presence')
          .select('username')
          .eq('room_id', roomId)
          .gte('last_seen', new Date(Date.now() - PRESENCE_TIMEOUT).toISOString());

        if (data) {
          setActiveUsers(new Set([...data.map(u => u.username), username]));
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const formattedMessages: Message[] = (data || []).map((msg: SupabaseMessage) => ({
          id: msg.id,
          user: msg.username,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
        }));

        setMessages(formattedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please refresh the page.');
      }
    };

    // Initialize
    updatePresence();
    fetchActiveUsers();
    fetchMessages();

    // Set up real-time subscriptions
    const messageChannel = supabase.channel('messages');
    const presenceChannel = supabase.channel('presence');

    messageChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as SupabaseMessage;
          setMessages((prev) => {
            const newMessages = [...prev];
            const exists = newMessages.some(msg => msg.id === newMessage.id);
            if (!exists) {
              newMessages.push({
                id: newMessage.id,
                user: newMessage.username,
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at).getTime(),
              });
              newMessages.sort((a, b) => a.timestamp - b.timestamp);
            }
            return newMessages;
          });
          scrollToBottom();
        }
      )
      .subscribe();
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom(); // if you have this already set up
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Initialize username
  React.useEffect(() => {
    getOrCreateUser()
      .then(username => {
        setUsername(username);
        setActiveUsers(new Set([username]));
      })
      .catch(error => {
        console.error('Error getting username:', error);
        setError('Failed to initialize user. Please refresh the page.');
      });
  }, []);

  React.useEffect(() => {
    if (!roomId || !username || !isValidUUID(roomId)) {
      return;
    }

    const updatePresence = async () => {
      try {
        const presenceId = crypto.randomUUID();
        await supabase.from('presence').upsert({
          id: presenceId,
          room_id: roomId,
          username,
          last_seen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const { data } = await supabase
          .from('presence')
          .select('username')
          .eq('room_id', roomId)
          .gte('last_seen', new Date(Date.now() - PRESENCE_TIMEOUT).toISOString());

        if (data) {
          setActiveUsers(new Set([...data.map(u => u.username), username]));
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const formattedMessages: Message[] = (data || []).map((msg: SupabaseMessage) => ({
          id: msg.id,
          user: msg.username,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
        }));

        setMessages(formattedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please refresh the page.');
      }
    };

    // Initialize
    updatePresence();
    fetchActiveUsers();
    fetchMessages();

    // Set up real-time subscriptions
    const messageChannel = supabase.channel('messages');
    const presenceChannel = supabase.channel('presence');

    messageChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as SupabaseMessage;
          setMessages((prev) => {
            const newMessages = [...prev];
            const exists = newMessages.some(msg => msg.id === newMessage.id);
            if (!exists) {
              newMessages.push({
                id: newMessage.id,
                user: newMessage.username,
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at).getTime(),
              });
              newMessages.sort((a, b) => a.timestamp - b.timestamp);
            }
            return newMessages;
          });
          scrollToBottom();
        }
      )
      .subscribe();
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom(); // if you have this already set up
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Initialize username
  React.useEffect(() => {
    getOrCreateUser()
      .then(username => {
        setUsername(username);
        setActiveUsers(new Set([username]));
      })
      .catch(error => {
        console.error('Error getting username:', error);
        setError('Failed to initialize user. Please refresh the page.');
      });
  }, []);

  React.useEffect(() => {
    if (!roomId || !username || !isValidUUID(roomId)) {
      return;
    }

    const updatePresence = async () => {
      try {
        const presenceId = crypto.randomUUID();
        await supabase.from('presence').upsert({
          id: presenceId,
          room_id: roomId,
          username,
          last_seen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const { data } = await supabase
          .from('presence')
          .select('username')
          .eq('room_id', roomId)
          .gte('last_seen', new Date(Date.now() - PRESENCE_TIMEOUT).toISOString());

        if (data) {
          setActiveUsers(new Set([...data.map(u => u.username), username]));
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const formattedMessages: Message[] = (data || []).map((msg: SupabaseMessage) => ({
          id: msg.id,
          user: msg.username,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
        }));

        setMessages(formattedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please refresh the page.');
      }
    };

    // Initialize
    updatePresence();
    fetchActiveUsers();
    fetchMessages();

    // Set up real-time subscriptions
    const messageChannel = supabase.channel('messages');
    const presenceChannel = supabase.channel('presence');

    messageChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as SupabaseMessage;
          setMessages((prev) => {
            const newMessages = [...prev];
            const exists = newMessages.some(msg => msg.id === newMessage.id);
            if (!exists) {
              newMessages.push({
                id: newMessage.id,
                user: newMessage.username,
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at).getTime(),
              });
              newMessages.sort((a, b) => a.timestamp - b.timestamp);
            }
            return newMessages;
          });
          scrollToBottom();
        }
      )
      .subscribe();
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom(); // if you have this already set up
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Initialize username
  React.useEffect(() => {
    getOrCreateUser()
      .then(username => {
        setUsername(username);
        setActiveUsers(new Set([username]));
      })
      .catch(error => {
        console.error('Error getting username:', error);
        setError('Failed to initialize user. Please refresh the page.');
      });
  }, []);

  React.useEffect(() => {
    if (!roomId || !username || !isValidUUID(roomId)) {
      return;
    }

    const updatePresence = async () => {
      try {
        const presenceId = crypto.randomUUID();
        await supabase.from('presence').upsert({
          id: presenceId,
          room_id: roomId,
          username,
          last_seen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const { data } = await supabase
          .from('presence')
          .select('username')
          .eq('room_id', roomId)
          .gte('last_seen', new Date(Date.now() - PRESENCE_TIMEOUT).toISOString());

        if (data) {
          setActiveUsers(new Set([...data.map(u => u.username), username]));
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const formattedMessages: Message[] = (data || []).map((msg: SupabaseMessage) => ({
          id: msg.id,
          user: msg.username,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
        }));

        setMessages(formattedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please refresh the page.');
      }
    };

    // Initialize
    updatePresence();
    fetchActiveUsers();
    fetchMessages();

    // Set up real-time subscriptions
    const messageChannel = supabase.channel('messages');
    const presenceChannel = supabase.channel('presence');

    messageChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as SupabaseMessage;
          setMessages((prev) => {
            const newMessages = [...prev];
            const exists = newMessages.some(msg => msg.id === newMessage.id);
            if (!exists) {
              newMessages.push({
                id: newMessage.id,
                user: newMessage.username,
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at).getTime(),
              });
              newMessages.sort((a, b) => a.timestamp - b.timestamp);
            }
            return newMessages;
          });
          scrollToBottom();
        }
      )
      .subscribe();
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom(); // if you have this already set up
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Initialize username
  React.useEffect(() => {
    getOrCreateUser()
      .then(username => {
        setUsername(username);
        setActiveUsers(new Set([username]));
      })
      .catch(error => {
        console.error('Error getting username:', error);
        setError('Failed to initialize user. Please refresh the page.');
      });
  }, []);

  React.useEffect(() => {
    if (!roomId || !username || !isValidUUID(roomId)) {
      return;
    }

    const updatePresence = async () => {
      try {
        const presenceId = crypto.randomUUID();
        await supabase.from('presence').upsert({
          id: presenceId,
          room_id: roomId,
          username,
          last_seen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const { data } = await supabase
          .from('presence')
          .select('username')
          .eq('room_id', roomId)
          .gte('last_seen', new Date(Date.now() - PRESENCE_TIMEOUT).toISOString());

        if (data) {
          setActiveUsers(new Set([...data.map(u => u.username), username]));
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const formattedMessages: Message[] = (data || []).map((msg: SupabaseMessage) => ({
          id: msg.id,
          user: msg.username,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
        }));

        setMessages(formattedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please refresh the page.');
      }
    };

    // Initialize
    updatePresence();
    fetchActiveUsers();
    fetchMessages();

    // Set up real-time subscriptions
    const messageChannel = supabase.channel('messages');
    const presenceChannel = supabase.channel('presence');

    messageChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as SupabaseMessage;
          setMessages((prev) => {
            const newMessages = [...prev];
            const exists = newMessages.some(msg => msg.id === newMessage.id);
            if (!exists) {
              newMessages.push({
                id: newMessage.id,
                user: newMessage.username,
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at).getTime(),
              });
              newMessages.sort((a, b) => a.timestamp - b.timestamp);
            }
            return newMessages;
          });
          scrollToBottom();
        }
      )
      .subscribe();
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom(); // if you have this already set up
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Initialize username
  React.useEffect(() => {
    getOrCreateUser()
      .then(username => {
        setUsername(username);
        setActiveUsers(new Set([username]));
      })
      .catch(error => {
        console.error('Error getting username:', error);
        setError('Failed to initialize user. Please refresh the page.');
      });
  }, []);

  React.useEffect(() => {
    if (!roomId || !username || !isValidUUID(roomId)) {
      return;
    }

    const updatePresence = async () => {
      try {
        const presenceId = crypto.randomUUID();
        await supabase.from('presence').upsert({
          id: presenceId,
          room_id: roomId,
          username,
          last_seen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const { data } = await supabase
          .from('presence')
          .select('username')
          .eq('room_id', roomId)
          .gte('last_seen', new Date(Date.now() - PRESENCE_TIMEOUT).toISOString());

        if (data) {
          setActiveUsers(new Set([...data.map(u => u.username), username]));
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const formattedMessages: Message[] = (data || []).map((msg: SupabaseMessage) => ({
          id: msg.id,
          user: msg.username,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
        }));

        setMessages(formattedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please refresh the page.');
      }
    };

    // Initialize
    updatePresence();
    fetchActiveUsers();
    fetchMessages();

    // Set up real-time subscriptions
    const messageChannel = supabase.channel('messages');
    const presenceChannel = supabase.channel('presence');

    messageChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as SupabaseMessage;
          setMessages((prev) => {
            const newMessages = [...prev];
            const exists = newMessages.some(msg => msg.id === newMessage.id);
            if (!exists) {
              newMessages.push({
                id: newMessage.id,
                user: newMessage.username,
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at).getTime(),
              });
              newMessages.sort((a, b) => a.timestamp - b.timestamp);
            }
            return newMessages;
          });
          scrollToBottom();
        }
      )
      .subscribe();
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom(); // if you have this already set up
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Initialize username
  React.useEffect(() => {
    getOrCreateUser()
      .then(username => {
        setUsername(username);
        setActiveUsers(new Set([username]));
      })
      .catch(error => {
        console.error('Error getting username:', error);
        setError('Failed to initialize user. Please refresh the page.');
      });
  }, []);

  React.useEffect(() => {
    if (!roomId || !username || !isValidUUID(roomId)) {
      return;
    }

    const updatePresence = async () => {
      try {
        const presenceId = crypto.randomUUID();
        await supabase.from('presence').upsert({
          id: presenceId,
          room_id: roomId,
          username,
          last_seen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const { data } = await supabase
          .from('presence')
          .select('username')
          .eq('room_id', roomId)
          .gte('last_seen', new Date(Date.now() - PRESENCE_TIMEOUT).toISOString());

        if (data) {
          setActiveUsers(new Set([...data.map(u => u.username), username]));
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const formattedMessages: Message[] = (data || []).map((msg: SupabaseMessage) => ({
          id: msg.id,
          user: msg.username,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
        }));

        setMessages(formattedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please refresh the page.');
      }
    };

    // Initialize
    updatePresence();
    fetchActiveUsers();
    fetchMessages();

    // Set up real-time subscriptions
    const messageChannel = supabase.channel('messages');
    const presenceChannel = supabase.channel('presence');

    messageChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as SupabaseMessage;
          setMessages((prev) => {
            const newMessages = [...prev];
            const exists = newMessages.some(msg => msg.id === newMessage.id);
            if (!exists) {
              newMessages.push({
                id: newMessage.id,
                user: newMessage.username,
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at).getTime(),
              } as Message);
              newMessages.sort((a, b) => a.timestamp - b.timestamp);
            }
            return newMessages;
          });
          scrollToBottom();
        }
      )
      .subscribe();
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrCreateUser } from '../lib/user';
import { isValidUUID } from '../types';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username, setUsername] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set());
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const presenceInterval = React.useRef<number>();

  // Validate UUID format
  React.useEffect(() => {
    if (!roomId || !isValidUUID(roomId)) {
      console.error('Invalid room ID format');
      navigate('/');
      return;
    }
  }, [roomId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom(); // if you have this already set up
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Initialize username
  React.useEffect(() => {
    getOrCreateUser()
      .then(username => {
        setUsername(username);
        setActiveUsers(new Set([username]));
      })
      .catch(error => {
        console.error('Error getting username:', error);
        setError('Failed to initialize user. Please refresh the page.');
      });
  }, []);

  React.useEffect(() => {
    if (!roomId || !username || !isValidUUID(roomId)) {
      return;
    }

    const updatePresence = async () => {
      try {
        const presenceId = crypto.randomUUID();
        await supabase.from('presence').upsert({
          id: presenceId,
          room_id: roomId,
          username,
          last_seen: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const { data } = await supabase
          .from('presence')
          .select('username')
          .eq('room_id', roomId)
          .gte('last_seen', new Date(Date.now() - PRESENCE_TIMEOUT).toISOString());

        if (data) {
          setActiveUsers(new Set([...data.map(u => u.username), username]));
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      }
    };

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const formattedMessages: Message[] = (data || []).map((msg: SupabaseMessage) => ({
          id: msg.id,
          user: msg.username,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
        }));

        setMessages(formattedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please refresh the page.');
      }
    };

    // Initialize
    updatePresence();
    fetchActiveUsers();
    fetchMessages();

    // Set up real-time subscriptions
    const messageChannel = supabase.channel('messages');
    const presenceChannel = supabase.channel('presence');

    messageChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as SupabaseMessage;
          setMessages((prev) => {
            const newMessages = [...prev];
            const exists = newMessages.some(msg => msg.id === newMessage.id);
            if (!exists) {
              newMessages.push({
                id: newMessage.id,
                user: newMessage.username,
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at).getTime(),
              });
              newMessages.sort((a, b) => a.timestamp - b.timestamp);
            }
            return newMessages;
          });
          scrollToBottom();
        }
      )
      .subscribe();

    presenceChannel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presence',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchActiveUsers();
        }
      )
      .subscribe();

    // Update presence periodically
    presenceInterval.current = window.setInterval(updatePresence, PRESENCE_UPDATE_INTERVAL);

    return () => {
      messageChannel.unsubscribe();
      presenceChannel.unsubscribe();
      if (presenceInterval.current) {
        clearInterval(presenceInterval.current);
      }
      supabase
        .from('presence')
        .delete()
        .match({ room_id: roomId, username })
        .then(() => {
          console.log('Presence cleaned up');
        });
    };
  }, [roomId, username]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !isValidUUID(roomId!)) return;
    setError(null);
    
    try {
      const messageId = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          id: messageId,
          room_id: roomId!,
          username,
          content: content.trim(),
        });

      if (insertError) throw insertError;

      setIsLoading(true);
      const lastMessages = messages.slice(-MESSAGES_LIMIT);
      const gptContent = await getGPTResponse(lastMessages);
      
      const { error: gptError } = await supabase
        .from('messages')
        .insert({
          id: crypto.randomUUID(),
          room_id: roomId!,
          username: 'GPT',
          content: gptContent,
        });

      if (gptError) throw gptError;
    } catch (error) {
      console.error('Error in message flow:', error);
      setError('Failed to process message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = () => {
    navigate('/');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!username) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Chat Room: {roomId}</h1>
              <p className="text-sm text-gray-500">Joined as: {username}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Link Copied!' : 'Copy Room Link'}
              </button>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showTimestamps}
                  onChange={(e) => setShowTimestamps(e.target.checked)}
                  className="rounded text-blue-500 focus:ring-blue-500"
                />
                Show Timestamps
              </label>
              <button
                onClick={handleLeaveRoom}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Leave Room
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>Active users:</span>
            <div className="flex flex-wrap gap-2">
              {Array.from(activeUsers).map((user) => (
                <span
                  key={user}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                >
                  {user}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full bg-white shadow-lg rounded-lg my-4 overflow-hidden">
        <MessageList messages={messages} showTimestamps={showTimestamps} />
        {isLoading && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm">
            GPT is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
        <ChatInput onSendMessage={handleSendMessage} />
        {error && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full text-sm">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
