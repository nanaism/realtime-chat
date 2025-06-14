import { socket } from "@/lib/socket";
import type { Message, User } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseChatSocketProps {
  username: string | null;
}

/**
 * チャットのソケット通信を管理するカスタムフック
 * Socket.IOによるリアルタイム通信機能を提供し、ユーザー情報、メッセージ、タイピング状態を処理します。
 */
export function useChatSocket({ username }: UseChatSocketProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isSocketInitialized, setIsSocketInitialized] = useState(false);
  const [currentUserSocketId, setCurrentUserSocketId] = useState<string | null>(
    null
  );
  const initializedSocketIdRef = useRef<string | null>(null);

  /**
   * ユーザー情報を初期化してサーバーに送信する関数
   */
  const initializeUser = useCallback(
    (name: string, currentSocketId: string) => {
      if (
        initializedSocketIdRef.current === currentSocketId &&
        isSocketInitialized
      ) {
        return;
      }

      const newUser: User = {
        id: currentSocketId,
        name: name,
        status: "online",
        position: {
          x: Math.floor(Math.random() * 600),
          y: Math.floor(Math.random() * 400),
        },
        color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${name}`,
      };

      // socket.emit でユーザー情報をサーバーに送信
      socket.emit("user:login", newUser);
      initializedSocketIdRef.current = currentSocketId;
      setIsSocketInitialized(true);
    },
    [isSocketInitialized]
  );

  // Socket接続とユーザー初期化を処理
  useEffect(() => {
    const handleConnect = () => {
      const currentSocketId = socket.id;
      if (!currentSocketId) {
        console.error(
          "[useChatSocket:handleConnect] Socket ID not available on connect."
        );
        return;
      }
      setCurrentUserSocketId(currentSocketId);
      if (username) {
        initializeUser(username, currentSocketId);
      }
    };

    if (username) {
      if (!socket.connected) {
        initializedSocketIdRef.current = null; // 新しい接続のためにリセット
        setIsSocketInitialized(false); // 初期化状態をリセット
        socket.connect();
      } else if (socket.id) {
        setCurrentUserSocketId(socket.id);
        initializeUser(username, socket.id);
      }
    }

    socket.on("connect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [username, initializeUser]);

  // 各種イベントリスナーを設定
  useEffect(() => {
    if (
      !username ||
      !socket.connected ||
      !isSocketInitialized ||
      !currentUserSocketId
    ) {
      return;
    }

    // 新しいメッセージを受信したときの処理
    const handleNewMessage = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    // ユーザーリストが更新されたときの処理
    const handleUsersUpdate = (updatedUsers: User[]) => {
      setUsers(updatedUsers);
    };

    // ユーザーのタイピング状態が変化したときの処理
    const handleUserTyping = ({
      name,
      isTyping,
    }: {
      userId: string;
      name: string;
      isTyping: boolean;
    }) => {
      setTypingUsers((prev) => {
        if (isTyping && !prev.includes(name)) {
          return [...prev, name];
        } else if (!isTyping) {
          return prev.filter((n) => n !== name);
        }
        return prev;
      });
    };

    // socket.on で、サーバーからのイベントを受信
    socket.on("message:new", handleNewMessage);
    socket.on("users:update", handleUsersUpdate);
    socket.on("user:typing", handleUserTyping);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("users:update", handleUsersUpdate);
      socket.off("user:typing", handleUserTyping);
    };
  }, [username, isSocketInitialized, currentUserSocketId]);

  // 切断時の状態クリーンアップ
  useEffect(() => {
    const handleDisconnect = () => {
      console.log("[useChatSocket] Disconnected. Clearing states.");
      initializedSocketIdRef.current = null;
      setIsSocketInitialized(false);
      setCurrentUserSocketId(null);
      setUsers([]);
      setMessages([]);
      setTypingUsers([]);
    };

    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  /**
   * メッセージをサーバーに送信する
   */
  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || !username || !currentUserSocketId) return;

      const newMessage: Omit<Message, "id"> = {
        type: "user",
        sender: username,
        content: content,
        timestamp: new Date().toISOString(),
      };

      socket.emit("message:send", newMessage);
      socket.emit("user:typing", false); // メッセージ送信後はタイピング状態を解除
    },
    [username, currentUserSocketId]
  );

  /**
   * タイピング状態をサーバーに通知する
   */
  const sendTypingUpdate = useCallback(
    (isTyping: boolean) => {
      if (!username || !currentUserSocketId) return;
      socket.emit("user:typing", isTyping);
    },
    [username, currentUserSocketId]
  );
  // ...

  /**
   * ユーザーのアバター位置を更新する
   */
  const sendUserMove = useCallback(
    (newPosition: { x: number; y: number }) => {
      // 修正: 条件を緩和し、自分のソケットIDが存在すれば送信するようにする
      if (currentUserSocketId) {
        socket.emit("user:move", newPosition);
      }
    },
    [currentUserSocketId] // 依存配列から users と username を削除
  );

  // ...

  /**
   * チャットルームからログアウトし、ソケット接続を切断する
   */
  const logout = useCallback(() => {
    if (socket.connected) {
      socket.disconnect();
    }
  }, []);

  return {
    users,
    messages,
    typingUsers,
    isSocketInitialized,
    currentUserSocketId,
    sendMessage,
    sendTypingUpdate,
    sendUserMove,
    logout,
  };
}
