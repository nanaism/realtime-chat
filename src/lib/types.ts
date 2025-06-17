export interface User {
  id: string; // サーバーで割り当てられるソケットID
  name: string;
  status: "online" | "offline" | "away";
  position: { x: number; y: number };
  color: string;
  avatar: string;
}

export interface Message {
  id: string;
  type: "user" | "system";
  sender: string;
  content: string;
  timestamp: string;
  reactions?: { [emoji: string]: string[] };
  replyTo?: string;
  replyContext?: {
    sender: string;
    content: string;
  };
  // SystemMessageItemで利用するため、systemTypeを追加
  systemType?:
    | "join"
    | "leave"
    | "admin"
    | "notification"
    | "activity"
    | "general";
}

export interface TypingStatus {
  userId: string;
  name: string;
  isTyping: boolean;
}

// サーバーからクライアントへ送られるイベント
export interface ServerToClientEvents {
  /** ログインが成功したことをクライアントに通知します */
  "user:login_success": (currentUser: User) => void;

  /** 初回のチャット履歴を送信します */
  "chat:history": (data: { history: Message[]; hasMore: boolean }) => void; // ★ 変更

  /** 過去のチャット履歴のチャンク（塊）を送信します */
  "history:chunk": (data: { history: Message[]; hasMore: boolean }) => void; // ★ 追加

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

  /** 過去のチャット履歴の取得を要求します */
  "fetch:history": (data: { cursor: string }) => void; // ★ 追加

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

  /** ユーザー名の重複チェックを依頼します */
  "user:check_name": (
    username: string,
    callback: (response: { available: boolean; message?: string }) => void
  ) => void;
}
