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
  sender: string; // senderを必須に変更（systemメッセージでも送信者情報を持つため）
  content: string;
  timestamp: string;
  // ▼▼▼ 以下を追加 ▼▼▼
  reactions?: { [emoji: string]: string[] }; // 例: { "👍": ["user1", "user2"], "❤️": ["user1"] }
}

export interface TypingStatus {
  userId: string;
  name: string;
  isTyping: boolean;
}

// Socket.IOのイベント型定義
export interface ServerToClientEvents {
  "chat:history": (history: Message[]) => void; // 履歴取得イベントを追加
  "message:new": (message: Message) => void;
  "users:update": (users: User[]) => void;
  "user:typing": (data: {
    userId: string;
    name: string;
    isTyping: boolean;
  }) => void;
  // ▼▼▼ 以下を追加 ▼▼▼
  "reaction:update": (data: {
    messageId: string;
    reactions: Message["reactions"];
  }) => void;
}

export interface ClientToServerEvents {
  "user:login": (userData: User) => void;
  "message:send": (message: Omit<Message, "id" | "reactions">) => void; // reactionsを除外
  "user:move": (position: { x: number; y: number }) => void;
  "user:typing": (isTyping: boolean) => void;
  // ▼▼▼ 以下を追加 ▼▼▼
  "reaction:add": (data: { messageId: string; emoji: string }) => void;
}
