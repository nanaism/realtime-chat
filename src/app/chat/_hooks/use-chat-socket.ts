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

// 接続状態をより明確に定義
type ConnectionStatus = "connecting" | "connected" | "error";

/**
 * チャットのソケット通信を管理するカスタムフック
 * (接続ロジックとエラーハンドリングを強化した安定版)
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

  // このuseEffectのロジックを全面的に修正
  useEffect(() => {
    // 1. ユーザー名がない場合は、既存の接続をクリーンアップして処理を終了
    if (!username) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      // 状態を初期化
      setConnectionStatus("connecting");
      setErrorMessage(null);
      return;
    }

    // 2. すでに接続済みの場合は何もしない
    if (socketRef.current?.connected) {
      return;
    }

    // --- ここから接続処理 ---
    console.log("[useChatSocket] Username provided, attempting to connect...");
    setConnectionStatus("connecting");
    setErrorMessage(null);

    // 3. 5秒の接続・ログインタイムアウトを設定
    // (万が一、login_successイベントが届かない場合に備える)
    connectionTimeoutRef.current = setTimeout(() => {
      console.error(
        "[useChatSocket] Connection or login timed out after 5 seconds."
      );
      setConnectionStatus("error");
      setErrorMessage(
        "サーバーへの接続がタイムアウトしました。ネットワーク状態を確認し、ページを再読み込みしてください。"
      );
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
        reconnection: false, // エラー時はページ全体で制御するため自動再接続は無効化
      }
    );
    socketRef.current = socket;

    // --- イベントリスナー ---

    socket.on("connect", () => {
      console.log("[useChatSocket] Socket connected with ID:", socket.id);
      // ログイン情報をサーバーに送信
      const newUser: Omit<User, "id"> = {
        name: username,
        status: "online",
        position: {
          x: Math.random() * 80 + 10,
          y: Math.random() * 80 + 10,
        },
        color: `hsl(${Math.random() * 360}, 70%, 70%)`,
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${username}`,
      };
      socket.emit("user:login", newUser);
    });

    socket.on("user:login_success", (currentUser: User) => {
      console.log("[useChatSocket] Login successful:", currentUser);
      clearConnectionTimeout(); // ★★★ ログイン成功！タイムアウトを解除
      setConnectionStatus("connected");
      setCurrentUserSocketId(currentUser.id);
    });

    socket.on("user:login_error", ({ message }: { message: string }) => {
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
      // 接続が確立する前に切断された場合もエラーとして扱う
      if (connectionStatus === "connecting") {
        clearConnectionTimeout();
        setConnectionStatus("error");
        setErrorMessage(
          "サーバーとの接続が確立する前に切断されました。ページを再読み込みしてください。"
        );
      }
      // 正常接続後の切断は、意図したログアウト等の可能性があるため、ここではエラーとしない
    });

    socket.on("chat:history", (history: Message[]) => {
      console.log("[useChatSocket] Received chat history:", history);
      setMessages(history);
    });

    socket.on("users:update", (updatedUsers: User[]) => {
      console.log("[useChatSocket] Received users:update", updatedUsers);
      setUsers(updatedUsers);
    });

    socket.on("message:new", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("user:typing", ({ name, userId, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.some((u) => u.userId === userId)
            ? prev
            : [...prev, { userId, name }];
        } else {
          return prev.filter((u) => u.userId !== userId);
        }
      });
    });

    socket.on(
      "reaction:update",
      ({
        messageId,
        reactions,
      }: {
        messageId: string;
        reactions: Message["reactions"];
      }) => {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === messageId ? { ...msg, reactions } : msg
          )
        );
      }
    );

    socket.on("message:deleted", ({ messageId }: { messageId: string }) => {
      console.log(`[useChatSocket] Message ${messageId} deleted.`);
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== messageId)
      );
    });

    socket.on("chat:history_cleared", (systemMessage: Message) => {
      console.log("[useChatSocket] Chat history has been cleared.");
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
  }, [username]); // ★★★ 依存配列を [username] のみに変更！

  const sendMessage = useCallback(
    (content: string, replyTo?: string) => {
      if (!content.trim() || !username || !socketRef.current) return;

      const newMessage: Omit<Message, "id" | "reactions" | "replyContext"> = {
        type: "user",
        sender: username,
        content: content,
        timestamp: new Date().toISOString(),
        replyTo,
      };
      socketRef.current.emit("message:send", newMessage);
      socketRef.current.emit("user:typing", false);
    },
    [username] // usernameに依存
  );

  const sendTypingUpdate = useCallback((isTyping: boolean) => {
    socketRef.current?.emit("user:typing", isTyping);
  }, []); // 依存なし

  const sendUserMove = useCallback((newPosition: { x: number; y: number }) => {
    socketRef.current?.emit("user:move", newPosition);
  }, []); // 依存なし

  const sendReaction = useCallback((messageId: string, emoji: string) => {
    socketRef.current?.emit("reaction:add", { messageId, emoji });
  }, []); // 依存なし

  const deleteMessage = useCallback((messageId: string) => {
    socketRef.current?.emit("message:delete", { messageId });
  }, []); // 依存なし

  const deleteMessageAsAdmin = useCallback((messageId: string) => {
    socketRef.current?.emit("admin:message:delete", { messageId });
  }, []); // 依存なし

  const clearChatHistory = useCallback(() => {
    socketRef.current?.emit("chat:clear_history");
  }, []); // 依存なし

  const logout = useCallback(() => {
    socketRef.current?.disconnect();
  }, []); // 依存なし

  const typingUserNames = typingUsers.map((user) => user.name);

  return {
    users,
    messages,
    typingUsers: typingUserNames,
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
