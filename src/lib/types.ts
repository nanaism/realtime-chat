export interface User {
  id: string;
  name: string;
  status: "online" | "offline" | "away";
  position: { x: number; y: number };
  color: string;
  avatar: string;
}

export interface Message {
  id: string;
  type: "user" | "system";
  sender?: string;
  content: string;
  timestamp: string;
}

export interface TypingStatus {
  userId: string;
  name: string;
  isTyping: boolean;
}

// Socket.IOのイベント型定義
export interface ServerToClientEvents {
  "message:new": (message: Message) => void;
  "users:update": (users: User[]) => void;
  "user:typing": (data: {
    userId: string;
    name: string;
    isTyping: boolean;
  }) => void;
}

export interface ClientToServerEvents {
  "user:login": (userData: User) => void;
  "message:send": (message: Omit<Message, "id">) => void;
  "user:move": (position: { x: number; y: number }) => void;
  "user:typing": (isTyping: boolean) => void;
}
