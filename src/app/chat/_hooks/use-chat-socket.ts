"use client";

import type {
  ClientToServerEvents,
  Message,
  ServerToClientEvents,
  User,
} from "@/lib/types"; // 修正: types.tsからインポート
import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface UseChatSocketProps {
  username: string | null;
}

/**
 * チャットのソケット通信を管理するカスタムフック
 * (チャット履歴・リアクション機能付き)
 */
export function useChatSocket({ username }: UseChatSocketProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<
    { userId: string; name: string }[]
  >([]);
  const [isSocketInitialized, setIsSocketInitialized] = useState(false);
  const [currentUserSocketId, setCurrentUserSocketId] = useState<string | null>(
    null
  );
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);

  useEffect(() => {
    if (!username) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || ""
    );
    socketRef.current = socket;

    // --- イベントリスナーをここでまとめて登録 ---

    socket.on("connect", () => {
      const currentSocketId = socket.id;
      if (currentSocketId) {
        console.log("[useChatSocket] Connected with ID:", currentSocketId);
        setCurrentUserSocketId(currentSocketId);
        setIsSocketInitialized(true);

        const newUser: Omit<User, "id"> = {
          name: username!,
          status: "online",
          position: {
            x: Math.random() * 80 + 10,
            y: Math.random() * 80 + 10,
          },
          color: `hsl(${Math.random() * 360}, 70%, 70%)`,
          avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${username}`,
        };
        // @ts-expect-error - 'id' はサーバー側で付与されるため、ここでは送信しない
        socket.emit("user:login", newUser);
      } else {
        console.error(
          "[useChatSocket] Socket connected but no ID was assigned."
        );
      }
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

    // ▼▼▼ ここからリアクション更新のリスナーを追加 ▼▼▼
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
    // ▲▲▲ ここまで追加 ▲▲▲

    socket.on("disconnect", () => {
      console.log("[useChatSocket] Disconnected. Clearing states.");
      setIsSocketInitialized(false);
      setCurrentUserSocketId(null);
      setUsers([]);
      setMessages([]);
      setTypingUsers([]);
    });

    return () => {
      console.log("[useChatSocket] Cleaning up socket connection.");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [username]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || !username || !socketRef.current) return;

      const newMessage: Omit<Message, "id" | "reactions"> = {
        type: "user",
        sender: username,
        content: content,
        timestamp: new Date().toISOString(),
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

  // ▼▼▼ ここからリアクション送信用の関数を追加 ▼▼▼
  const sendReaction = useCallback((messageId: string, emoji: string) => {
    socketRef.current?.emit("reaction:add", { messageId, emoji });
  }, []);
  // ▲▲▲ ここまで追加 ▲▲▲

  const logout = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  const typingUserNames = typingUsers.map((user) => user.name);

  return {
    users,
    messages,
    typingUsers: typingUserNames,
    isSocketInitialized,
    currentUserSocketId,
    sendMessage,
    sendTypingUpdate,
    sendUserMove,
    sendReaction, // ◀◀◀ 追加
    logout,
  };
}
