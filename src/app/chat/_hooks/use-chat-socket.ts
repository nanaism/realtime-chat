"use client";

import type {
  ClientToServerEvents,
  Message,
  ServerToClientEvents,
  User,
} from "@/lib/types"; // 修正: types.tsからインポート
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
      console.log("[useChatSocket] Connected with ID:", socket.id);

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
      // 接続が確立したら、ログイン情報を送信
      socket.emit("user:login", newUser);
    });

    // ★★★ ログイン成功イベントをリッスン ★★★
    socket.on("user:login_success", (currentUser: User) => {
      console.log("[useChatSocket] Login successful:", currentUser);
      setCurrentUserSocketId(currentUser.id);
      setIsSocketInitialized(true); // ここで初期化完了とする
    });

    // ★★★ ログインエラー（重複）イベントをリッスン ★★★
    socket.on("user:login_error", ({ message }: { message: string }) => {
      console.error("[useChatSocket] Login failed:", message);

      // ソケット接続を明示的に切断し、再接続ループを防ぐ
      socket.disconnect();

      // エラーメッセージをユーザーに通知
      alert(message + "\nトップページに戻ります。");

      // ページをリダイレクト (replaceで履歴に残さない)
      router.replace("/");
    });

    // chat:history と users:update はそのまま
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

    socket.on("message:deleted", ({ messageId }: { messageId: string }) => {
      console.log(`[useChatSocket] Message ${messageId} deleted.`);
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== messageId)
      );
    });

    socket.on("chat:history_cleared", (systemMessage: Message) => {
      console.log("[useChatSocket] Chat history has been cleared.");
      setMessages([systemMessage]); // 履歴をシステムメッセージのみで上書き
    });

    socket.on("disconnect", () => {
      console.log("[useChatSocket] Disconnected.");
      // ★★★ 状態リセットはlogin_errorで能動的に行うので、ここではシンプルにログ出力のみ
      // isSocketInitialized などを false にすると、正常なタブ閉じ->再アクセスで問題が起きる可能性があるため
    });

    return () => {
      console.log("[useChatSocket] Cleaning up socket connection.");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [username, router]);

  const sendMessage = useCallback(
    // ▼▼▼ 変更: replyToを引数に追加 ▼▼▼
    (content: string, replyTo?: string) => {
      if (!content.trim() || !username || !socketRef.current) return;

      const newMessage: Omit<Message, "id" | "reactions" | "replyContext"> = {
        type: "user",
        sender: username,
        content: content,
        timestamp: new Date().toISOString(),
        replyTo, // ここでリプライ先のIDをセット
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

  const deleteMessage = useCallback((messageId: string) => {
    socketRef.current?.emit("message:delete", { messageId });
  }, []);

  const clearChatHistory = useCallback(() => {
    socketRef.current?.emit("chat:clear_history");
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
    sendReaction, // ◀◀◀ 追加
    deleteMessage,
    clearChatHistory,
    logout,
  };
}
