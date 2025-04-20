export type User = {
  id?: string;
  name: string;
  color: string;
  apiKey?: string;
  preferredModel?: string;
};

export type Message = {
  id: string;
  sender: string;
  senderName: string;
  text: string;
  timestamp: string;
};

export type Room = {
  id: string;
  name: string;
};

export type UserTypingStatus = {
  userId: string;
  isTyping: boolean;
};

export type AIModel = {
  id: string;
  name: string;
  provider: string;
};