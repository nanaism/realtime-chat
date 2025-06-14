// app/chat/_hooks/use-chat-socket.ts (修正後)

"use client";

import type { Message, User } from "@/lib/types"; // 型定義はそのまま利用
import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

// --- ★★★ 修正ポイント(1): グローバルなsocketではなく、このフック内でインスタンスを管理 ---
// import { socket } from "@/lib/socket"; // ← この行は不要になります

interface UseChatSocketProps {
  username: string | null;
}

/**
 * チャットのソケット通信を管理するカスタムフック
 * (よりシンプルで堅牢なバージョン)
 */
export function useChatSocket({ username }: UseChatSocketProps) {
  // --- State定義はほぼ同じ ---
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  // タイピングユーザーはオブジェクトで管理する方が堅牢です
  const [typingUsers, setTypingUsers] = useState<
    { userId: string; name: string }[]
  >([]);
  const [isSocketInitialized, setIsSocketInitialized] = useState(false);
  const [currentUserSocketId, setCurrentUserSocketId] = useState<string | null>(
    null
  );

  // --- ★★★ 修正ポイント(2): socketインスタンスをuseRefで管理 ---
  const socketRef = useRef<Socket | null>(null);

  // --- ★★★ 修正ポイント(3): 複数のuseEffectを一つに統合し、ロジックを大幅に簡素化 ---
  useEffect(() => {
    // ユーザー名がなければ何もしない（切断処理）
    if (!username) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // すでに接続済みの場合は何もしない（意図しない再接続を防止）
    if (socketRef.current?.connected) {
      return;
    }

    // Socketインスタンスを生成
    // process.env.NEXT_PUBLIC_SOCKET_URLなど環境変数でURLを指定するのが一般的です
    // 空の場合は現在のホストに接続します
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "");
    socketRef.current = socket;

    // --- イベントリスナーをここでまとめて登録 ---
    // これにより、接続完了とリスナー登録の間のレースコンディションを完全に防げます。

    // 接続が確立したときの処理
    socket.on("connect", () => {
      // ▼▼▼ ここから修正 ▼▼▼
      const currentSocketId = socket.id;

      // socket.idが存在することをチェックして、型エラーを解消
      if (currentSocketId) {
        console.log("[useChatSocket] Connected with ID:", currentSocketId);
        setCurrentUserSocketId(currentSocketId);
        setIsSocketInitialized(true);

        // ユーザー情報を生成してログインイベントを送信
        const newUser: Omit<User, "id"> = {
          // idはサーバー側でsocket.idから付与
          name: username!, // ここではusernameの存在が保証されているため `!` を使用してよい
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
      // ▲▲▲ ここまで修正 ▲▲▲
    });

    // ユーザーリスト更新の受信 (問題の箇所)
    socket.on("users:update", (updatedUsers: User[]) => {
      console.log("[useChatSocket] Received users:update", updatedUsers);
      setUsers(updatedUsers); // これで確実にStateが更新される
    });

    // 新規メッセージの受信
    socket.on("message:new", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    // タイピング状態の受信
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

    // 切断時の処理
    socket.on("disconnect", () => {
      console.log("[useChatSocket] Disconnected. Clearing states.");
      setIsSocketInitialized(false);
      setCurrentUserSocketId(null);
      setUsers([]);
      setMessages([]);
      setTypingUsers([]);
    });

    // コンポーネントがアンマウントされるか、usernameが変更されたときのクリーンアップ処理
    return () => {
      console.log("[useChatSocket] Cleaning up socket connection.");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [username]); // 依存配列は `username` のみ。これで十分です。

  // --- ★★★ 修正ポイント(4): サーバーへイベントを送信する関数群 ---
  // グローバルな `socket` ではなく `socketRef.current` を使うように修正

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
      // タイピング状態の解除もここで行う
      socketRef.current.emit("user:typing", false);
    },
    [username] // 依存配列もシンプルに
  );

  const sendTypingUpdate = useCallback((isTyping: boolean) => {
    socketRef.current?.emit("user:typing", isTyping);
  }, []); // 依存配列は空でOK

  const sendUserMove = useCallback((newPosition: { x: number; y: number }) => {
    socketRef.current?.emit("user:move", newPosition);
  }, []); // 依存配列は空でOK

  const logout = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  // 返り値の typingUsers は、名前の配列に変換して後方互換性を保つ
  const typingUserNames = typingUsers.map((user) => user.name);

  return {
    users,
    messages,
    typingUsers: typingUserNames, // 必要であれば元の string[] 形式で返す
    isSocketInitialized,
    currentUserSocketId,
    sendMessage,
    sendTypingUpdate,
    sendUserMove,
    logout,
  };
}
