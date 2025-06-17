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

/**
 * チャットのソケット通信を管理するカスタムフック
 * (安定版ロジック + WebSocket接続の明示化による堅牢性向上版)
 */
export function useChatSocket({ username }: UseChatSocketProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<
    { userId: string; name: string }[]
  >([]);
  const [currentUserSocketId, setCurrentUserSocketId] = useState<string | null>(
    null
  );
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
      return;
    }

    // 2. 既に接続済みなら何もしない
    if (socketRef.current?.connected) {
      return;
    }

    // --- 接続処理開始 ---
    console.log("[useChatSocket] Attempting to connect...");
    setConnectionStatus("connecting");
    setErrorMessage(null);

    // 3. 5秒の接続・ログインタイムアウトを設定
    connectionTimeoutRef.current = setTimeout(() => {
      console.error(
        "[useChatSocket] Connection or login timed out after 5 seconds."
      );
      setConnectionStatus("error");
      setErrorMessage("サーバーへの接続がタイムアウトしました。");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }, 5000);

    const clearConnectionTimeout = () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };

    // 4. ソケットインスタンスの作成とイベントリスナーの設定
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "",
      {
        reconnection: false, // エラー時はページ全体で制御
        // ▼▼▼ 接続方式をWebSocketに限定して安定化を図る ▼▼▼
        transports: ["websocket"],
      }
    );
    socketRef.current = socket;

    // --- イベントリスナー ---

    socket.on("connect", () => {
      console.log("[useChatSocket] Socket connected with ID:", socket.id);
      const newUser: Omit<User, "id"> = {
        name: username,
        status: "online",
        position: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 },
        color: `hsl(${Math.random() * 360}, 70%, 70%)`,
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${username}`,
      };
      socket.emit("user:login", newUser);
    });

    socket.on("user:login_success", (currentUser: User) => {
      console.log("[useChatSocket] Login successful:", currentUser);
      clearConnectionTimeout(); // ★★★ ログイン成功！タイムアウトを解除
      setCurrentUserSocketId(currentUser.id);
      setConnectionStatus("connected"); // ★★★ この時点で接続完了とみなす
    });

    socket.on("chat:history", (history: Message[]) => {
      console.log("[useChatSocket] Received chat history:", history);
      setMessages(history);
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
      setErrorMessage(`サーバーに接続できませんでした: ${err.message}`);
      socket.disconnect();
    });

    socket.on("disconnect", (reason) => {
      console.log(`[useChatSocket] Disconnected. Reason: ${reason}`);
      if (connectionStatus === "connecting") {
        clearConnectionTimeout();
        setConnectionStatus("error");
        setErrorMessage("サーバーとの接続が確立する前に切断されました。");
      }
    });

    // ... (他のリスナーは変更なし)
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

    // 5. クリーンアップ関数
    return () => {
      console.log("[useChatSocket] Cleanup: Disconnecting socket.");
      clearConnectionTimeout();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // ... (useCallbackでラップされた関数群は変更なし)
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
    currentUserSocketId,
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
  };
}
