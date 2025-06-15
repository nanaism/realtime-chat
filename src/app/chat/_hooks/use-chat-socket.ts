"use client";

import type { Message, User } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface UseChatSocketProps {
  username: string | null;
}

/**
 * チャットのソケット通信を管理するカスタムフック
 * (チャット履歴機能付き)
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
  const socketRef = useRef<Socket | null>(null);

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

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "");
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
        socket.emit("user:login", newUser);
      } else {
        console.error(
          "[useChatSocket] Socket connected but no ID was assigned."
        );
      }
    });

    // --- ▼▼▼ ここから追加 ▼▼▼ ---
    // サーバーからチャット履歴を受信
    socket.on("chat:history", (history: Message[]) => {
      console.log("[useChatSocket] Received chat history:", history);
      // 受信した履歴でメッセージのstateを初期化します。
      // この後、新しいメッセージは 'message:new' で随時追加されていきます。
      setMessages(history);
    });
    // --- ▲▲▲ ここまで追加 ▲▲▲ ---

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

      const newMessage: Omit<Message, "id"> = {
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
    logout,
  };
}
