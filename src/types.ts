export interface Message {
  id: string;
  user: string;
  content: string;
  timestamp: number;
}

export interface ChatRoom {
  id: string;
  messages: Message[];
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface OpenRouterError {
  error: {
    message: string;
    type: string;
  };
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}