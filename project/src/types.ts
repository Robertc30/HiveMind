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