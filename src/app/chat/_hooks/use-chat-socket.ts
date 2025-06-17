"use client";

import type {
  ClientToServerEvents,
  Message,
  ServerToClientEvents,
  User,
} from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface UseChatSocketProps {
  username: string | null;
}

type ConnectionStatus = "connecting" | "connected" | "error";

// ★★★ 修正点 1: サーバーURLをフックの外に定義 ★★★
// process.env.NEXT_PUBLIC_SOCKET_SERVER_URL が設定されていればそれを使用し、
// なければローカル開発用のURLをフォールバックとして使用します。
// これにより、環境変数の設定漏れも防げます。
const SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:3000";

/**
 * チャットのソケット通信を管理するカスタムフック
 * (ページネーション対応版)
 */
export function useChatSocket({ username }: UseChatSocketProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<
    { userId: string; name: string }[]
  >([]);
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. ユーザー名がない場合はクリーンアップ
    if (!username) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnectionStatus("connecting");
      setErrorMessage(null);
      setMessages([]);
      setUsers([]);
      setTypingUsers([]);
      setHasMoreMessages(true);
      setIsFetchingHistory(false);
      return;
    }

    // 2. 既に接続済みなら何もしない
    if (socketRef.current?.connected) {
      return;
    }

    // --- 接続処理開始 ---
    setConnectionStatus("connecting");
    setErrorMessage(null);
    setMessages([]); // 新しい接続の前にメッセージをクリア

    // 3. 8秒の接続・ログインタイムアウトを設定 (少し長めに)
    connectionTimeoutRef.current = setTimeout(() => {
      console.error(
        "[useChatSocket] Connection or login timed out after 8 seconds."
      );
      setConnectionStatus("error");
      setErrorMessage("サーバーへの接続がタイムアウトしました。");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }, 8000);

    const clearConnectionTimeout = () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };

    // ★★★ 修正点 2: io() に正しいサーバーURLとオプションを渡す ★★★
    // 外部で定義した SERVER_URL を使用します。
    // また、autoConnect: false を追加して、手動で接続を開始するようにします。
    // これにより、リスナー設定前に接続が試みられることを防ぎ、安定性が向上します。
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      SERVER_URL,
      {
        reconnection: false,
        transports: ["websocket"], // WebSocketを優先
        autoConnect: false, // 手動で接続を開始する
      }
    );
    socketRef.current = socket;

    // --- イベントリスナー ---

    socket.on("connect", () => {
      console.log("[useChatSocket] Socket connected. Emitting user:login...");
      const newUser: Omit<User, "id"> = {
        name: username,
        status: "online",
        position: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 },
        color: `hsl(${Math.random() * 360}, 70%, 70%)`,
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${username}`,
      };
      socket.emit("user:login", newUser);
    });

    socket.on("user:login_success", () => {
      console.log("[useChatSocket] Login successful!");
      clearConnectionTimeout();
      setConnectionStatus("connected");
    });

    socket.on("chat:history", ({ history, hasMore }) => {
      setMessages(history);
      setHasMoreMessages(hasMore);
    });

    socket.on("history:chunk", ({ history, hasMore }) => {
      setMessages((prev) => [...history, ...prev]);
      setHasMoreMessages(hasMore);
      setIsFetchingHistory(false);
    });

    socket.on("user:login_error", ({ message }) => {
      console.error("[useChatSocket] Login failed:", message);
      clearConnectionTimeout();
      setConnectionStatus("error");
      setErrorMessage(message);
      socket.disconnect();
    });

    socket.on("connect_error", (err) => {
      console.error(
        "[useChatSocket] Connection establishment error:",
        err.message
      );
      clearConnectionTimeout();
      setConnectionStatus("error");
      // ★★★ 修正点 3: エラーメッセージをより具体的に ★★★
      setErrorMessage(`サーバー (${SERVER_URL}) への接続に失敗しました。`);
      socket.disconnect();
    });

    socket.on("disconnect", () => {
      // 接続が意図せず切れた場合のエラーハンドリング
      if (connectionStatus === "connected") {
        console.warn("[useChatSocket] Disconnected from server.");
        setConnectionStatus("error");
        setErrorMessage("サーバーとの接続が切れました。");
      }
    });

    socket.on("users:update", (updatedUsers) => setUsers(updatedUsers));
    socket.on("message:new", (message) =>
      setMessages((prev) => [...prev, message])
    );
    socket.on("user:typing", ({ name, userId, isTyping }) => {
      setTypingUsers((prev) =>
        isTyping
          ? prev.some((u) => u.userId === userId)
            ? prev
            : [...prev, { userId, name }]
          : prev.filter((u) => u.userId !== userId)
      );
    });
    socket.on("reaction:update", ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, reactions } : msg))
      );
    });
    socket.on("message:deleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    });
    socket.on("chat:history_cleared", (systemMessage) => {
      setMessages([systemMessage]);
    });

    // ★★★ 修正点 4: 手動で接続を開始 ★★★
    // すべてのイベントリスナーを登録した後に、接続を開始します。
    socket.connect();

    // 5. クリーンアップ関数
    return () => {
      clearConnectionTimeout();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const fetchHistory = useCallback(() => {
    if (
      isFetchingHistory ||
      !hasMoreMessages ||
      !socketRef.current ||
      messages.length === 0
    ) {
      return;
    }
    setIsFetchingHistory(true);
    const oldestMessageTimestamp = messages[0].timestamp;
    socketRef.current.emit("fetch:history", { cursor: oldestMessageTimestamp });
  }, [isFetchingHistory, hasMoreMessages, messages]);

  const sendMessage = useCallback(
    (content: string, replyTo?: string) => {
      if (!content.trim() || !username || !socketRef.current) return;
      const newMessage: Omit<Message, "id" | "reactions" | "replyContext"> = {
        type: "user",
        sender: username,
        content,
        timestamp: new Date().toISOString(),
        replyTo,
      };
      socketRef.current.emit("message:send", newMessage);
      socketRef.current.emit("user:typing", false);
    },
    [username]
  );

  const sendTypingUpdate = useCallback((isTyping: boolean) => {
    socketRef.current?.emit("user:typing", isTyping);
  }, []);

  const sendUserMove = useCallback((newPosition: { x: number; y: number }) => {
    socketRef.current?.emit("user:move", newPosition);
  }, []);

  const sendReaction = useCallback((messageId: string, emoji: string) => {
    socketRef.current?.emit("reaction:add", { messageId, emoji });
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    socketRef.current?.emit("message:delete", { messageId });
  }, []);

  const deleteMessageAsAdmin = useCallback((messageId: string) => {
    socketRef.current?.emit("admin:message:delete", { messageId });
  }, []);

  const clearChatHistory = useCallback(() => {
    socketRef.current?.emit("chat:clear_history");
  }, []);

  const logout = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  return {
    users,
    messages,
    typingUsers: typingUsers.map((user) => user.name),
    connectionStatus,
    errorMessage,
    sendMessage,
    sendTypingUpdate,
    sendUserMove,
    sendReaction,
    deleteMessage,
    deleteMessageAsAdmin,
    clearChatHistory,
    logout,
    hasMoreMessages,
    isFetchingHistory,
    fetchHistory,
  };
}
