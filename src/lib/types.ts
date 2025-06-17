export interface User {
  id: string; // サーバーで割り当てられるソケットID
  name: string;
  // statusの型は既存のままとします
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
  reactions?: { [emoji: string]: string[] }; // 例: { "👍": ["user1", "user2"], "❤️": ["user1"] }
  // ▼▼▼ リプライ機能のためのプロパティを追加 ▼▼▼
  replyTo?: string; // リプライ先のメッセージID
  replyContext?: {
    sender: string;
    content: string;
  };
  // ▲▲▲ 追加 ▲▲▲
}

export interface TypingStatus {
  userId: string;
  name: string;
  isTyping: boolean;
}

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
  "message:deleted": (data: { messageId: string }) => void;
  "chat:history_cleared": (systemMessage: Message) => void;

  // --- ▼▼▼ ここからが変更箇所 ▼▼▼ ---
  /** ログインが成功したことをクライアントに通知します */
  "user:login_success": (currentUser: User) => void;

  /** ログインが失敗（例: ユーザー名重複）したことをクライアントに通知します */
  "user:login_error": (error: { message: string }) => void;
  // --- ▲▲▲ ここまでが変更箇所 ▲▲▲ ---
}

export interface ClientToServerEvents {
  // --- ▼▼▼ ここからが変更箇所 ▼▼▼ ---
  /**
   * ユーザーがログインを試みます。
   * クライアントはIDを含まないユーザー情報を送信します。
   */
  "user:login": (userData: Omit<User, "id">) => void;
  // --- ▲▲▲ ここまでが変更箇所 ▲▲▲ ---

  // ▼▼▼ 変更: message:sendでreplyToを送れるようにする ▼▼▼
  // replyContextはサーバー側で付与するため、クライアントからは送信しない
  "message:send": (
    message: Omit<Message, "id" | "reactions" | "replyContext">
  ) => void;
  // ▲▲▲ 変更 ▲▲▲
  "user:move": (position: { x: number; y: number }) => void;
  "user:typing": (isTyping: boolean) => void;
  "reaction:add": (data: { messageId: string; emoji: string }) => void;
  "message:delete": (data: { messageId: string }) => void;
  "chat:clear_history": () => void;

  // ▼▼▼ 変更点: 管理者用のメッセージ削除イベントを追加 ▼▼▼
  "admin:message:delete": (data: { messageId: string }) => void;
  // ▲▲▲ 変更点 ▲▲▲
}
