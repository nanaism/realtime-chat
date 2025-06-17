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

// =============================================================
// ▼▼▼ ここからが emit方式に合わせた正しい型定義 ▼▼▼
// =============================================================

// サーバーからクライアントへ送られるイベント
export interface ServerToClientEvents {
  /** ログインが成功したことをクライアントに通知します */
  "user:login_success": (currentUser: User) => void;

  /** チャット履歴を送信します */
  "chat:history": (history: Message[]) => void;

  /** 新しいメッセージを通知します */
  "message:new": (message: Message) => void;

  /** ユーザーリストの更新を通知します */
  "users:update": (users: User[]) => void;

  /** タイピング状態を通知します */
  "user:typing": (data: TypingStatus) => void;

  /** リアクションの更新を通知します */
  "reaction:update": (data: {
    messageId: string;
    reactions: Message["reactions"];
  }) => void;

  /** メッセージの削除を通知します */
  "message:deleted": (data: { messageId: string }) => void;

  /** 履歴の全削除を通知します */
  "chat:history_cleared": (systemMessage: Message) => void;

  /** ログインエラーを通知します（名前重複など） */
  "user:login_error": (error: { message: string }) => void;
}

// クライアントからサーバーへ送られるイベント
export interface ClientToServerEvents {
  /** ユーザーがログインを試みます */
  "user:login": (userData: Omit<User, "id">) => void;

  /** メッセージを送信します */
  "message:send": (
    message: Omit<Message, "id" | "reactions" | "replyContext">
  ) => void;

  /** ユーザーの移動を通知します */
  "user:move": (position: { x: number; y: number }) => void;

  /** タイピング状態を通知します */
  "user:typing": (isTyping: boolean) => void;

  /** リアクションを追加/削除します */
  "reaction:add": (data: { messageId: string; emoji: string }) => void;

  /** メッセージを削除します */
  "message:delete": (data: { messageId: string }) => void;

  /** 履歴を全削除します */
  "chat:clear_history": () => void;

  /** 管理者権限でメッセージを削除します */
  "admin:message:delete": (data: { messageId: string }) => void;

  /** ユーザー名の重複チェックを依頼します (これは元のコードにあったので残します) */
  "user:check_name": (
    username: string,
    callback: (response: { available: boolean; message?: string }) => void
  ) => void;
}
