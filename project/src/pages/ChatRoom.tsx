import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { getGPTResponse } from '../utils/openRouter';
import { LogOut, Copy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Message } from '../types';
import type { Database } from '../types/supabase';

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];

const MESSAGES_LIMIT = 10;
const ACTIVE_USERS_KEY = 'chatroom_active_users';

const generateUsername = () => {
  const adjectives = ["Swift", "Loud", "Silent", "Witty", "Clever", "Bright", "Wise", "Quick"];
  const animals = ["Tiger", "Falcon", "Panther", "Otter", "Wolf", "Eagle", "Bear", "Fox"];
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${animals[Math.floor(Math.random() * animals.length)]}`;
};

export function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [username] = React.useState(() => {
    const stored = localStorage.getItem(`username_${roomId}`);
    return stored || generateUsername();
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [activeUsers, setActiveUsers] = React.useState<Set<string>>(new Set([username]));
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    // Store username in localStorage
    localStorage.setItem(`username_${roomId}`, username);

    // Broadcast user presence
    const broadcastPresence = async () => {
      const { data: existingUsers } = await supabase
        .from('presence')
        .select('username')
        .eq('room_id', roomId);

      const users = new Set([
        ...(existingUsers?.map(u => u.username) || []),
        username
      ]);
      setActiveUsers(users);

      // Update presence
      await supabase.from('presence').upsert({
        room_id: roomId,
        username,
        last_seen: new Date().toISOString()
      });
    };

    // Fetch existing messages
    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })
          .limit(50);

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
    broadcastPresence();
    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`room:${roomId}`)
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
          setMessages((current) => [
            ...current,
            {
              id: newMessage.id,
              user: newMessage.username,
              content: newMessage.content,
              timestamp: new Date(newMessage.created_at).getTime(),
            },
          ]);
          scrollToBottom();
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      subscription.unsubscribe();
      supabase
        .from('presence')
        .delete()
        .match({ room_id: roomId, username })
        .then(() => {
          console.log('Presence cleaned up');
        });
    };
  }, [roomId, username, navigate]);

  const handleSendMessage = async (content: string) => {
    setError(null);
    
    try {
      // Insert user message
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          room_id: roomId!,
          username,
          content,
        });

      if (insertError) throw insertError;

      // Get GPT response
      setIsLoading(true);
      const lastMessages = messages.slice(-MESSAGES_LIMIT);
      const gptContent = await getGPTResponse(lastMessages);
      
      // Insert GPT response
      const { error: gptError } = await supabase
        .from('messages')
        .insert({
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
        <div ref={messagesEndRef} />
        <ChatInput onSendMessage={handleSendMessage} />
        {isLoading && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm">
            GPT is thinking...
          </div>
        )}
        {error && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full text-sm">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}