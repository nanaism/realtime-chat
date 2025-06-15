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
// ... 既存の型定義 ...

// Socket.IOのイベント型定義
export interface ServerToClientEvents {
  "chat:history": (history: Message[]) => void;
  "message:new": (message: Message) => void;
  "users:update": (users: User[]) => void;
  "user:typing": (data: {
    userId: string;
    name: string;
    isTyping: boolean;
  }) => void;
  "reaction:update": (data: {
    messageId: string;
    reactions: Message["reactions"];
  }) => void;
  // ▼▼▼ ここから追加 ▼▼▼
  "message:deleted": (data: { messageId: string }) => void; // 個別メッセージ削除通知
  "chat:history_cleared": (systemMessage: Message) => void; // 全履歴削除通知
  // ▲▲▲ ここまで追加 ▲▲▲
}

export interface ClientToServerEvents {
  "user:login": (userData: User) => void;
  "message:send": (message: Omit<Message, "id" | "reactions">) => void;
  "user:move": (position: { x: number; y: number }) => void;
  "user:typing": (isTyping: boolean) => void;
  "reaction:add": (data: { messageId: string; emoji: string }) => void;
  // ▼▼▼ ここから追加 ▼▼▼
  "message:delete": (data: { messageId: string }) => void; // 個別メッセージ削除リクエスト
  "chat:clear_history": () => void; // 全履歴削除リクエスト
  // ▲▲▲ ここまで追加 ▲▲▲
}
