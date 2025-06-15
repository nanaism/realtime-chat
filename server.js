/**
 * Next.jsカスタムサーバー兼Socket.IOサーバー
 *
 * このモジュールは、Next.jsアプリケーションを提供し、Socket.IOを統合して
 * リアルタイム通信機能（チャット、ユーザー状態同期など）を実現します。
 * チャット履歴機能も備えています。
 */
import next from "next";
import { createServer } from "node:http";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;

const app = next({ dev });
const handle = app.getRequestHandler();

// 接続中のユーザー情報を保持するMapオブジェクト
const users = new Map();

// --- ▼▼▼ ここから追加 ▼▼▼ ---
// チャット履歴を保持する配列
const messageHistory = [];
// メモリを圧迫しないよう、保持する履歴の最大数を設定 (例: 100件)
const MAX_HISTORY = 10000;
// --- ▲▲▲ ここまで追加 ▲▲▲ ---

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server);

  io.engine.on("connection_error", (err) => {
    console.log("Connection error:", err);
  });

  io.on("connection", (socket) => {
    console.log(`接続確立: ${socket.id}`);

    socket.on("user:check_name", (username, callback) => {
      const existingUser = Array.from(users.values()).find(
        (u) => u.name === username
      );
      if (existingUser) {
        callback({
          available: false,
          message: "この表示名は既に使用されています。",
        });
      } else {
        callback({
          available: true,
        });
      }
    });

    socket.on("user:login", (userData) => {
      console.log("ログインデータ受信:", userData);

      const existingUser = Array.from(users.values()).find(
        (u) => u.name === userData.name
      );
      if (existingUser) {
        console.log(
          `ユーザー "${userData.name}" が再接続しました。古い接続 (${existingUser.id}) を切断します。`
        );
        io.to(existingUser.id).disconnect();
        users.delete(existingUser.id);
      }

      // --- ▼▼▼ ここから追加 ▼▼▼ ---
      // ログインしたユーザーに現在のチャット履歴を送信する
      // `socket.emit` は、このイベントをトリガーしたクライアントにのみ送信します。
      console.log(
        `履歴を送信: ${socket.id} へ ${messageHistory.length} 件のメッセージ`
      );
      socket.emit("chat:history", messageHistory);
      // --- ▲▲▲ ここまで追加 ▲▲▲ ---

      const updatedUserData = {
        ...userData,
        id: socket.id,
      };
      users.set(socket.id, updatedUserData);

      // 入室メッセージを作成
      const systemMessage = {
        id: `msg-${Date.now()}`,
        type: "system",
        content: `${updatedUserData.name} が入室しました`,
        timestamp: new Date().toISOString(),
      };

      // --- ▼▼▼ ここから修正 ▼▼▼ ---
      // メッセージを履歴に追加し、上限を超えたら古いものを削除
      messageHistory.push(systemMessage);
      if (messageHistory.length > MAX_HISTORY) {
        messageHistory.shift();
      }
      // 全員に新しい入室メッセージを通知
      io.emit("message:new", systemMessage);
      // --- ▲▲▲ ここまで修正 ▲▲▲ ---

      const usersList = Array.from(users.values());
      io.emit("users:update", usersList);

      console.log(`ログイン: ${updatedUserData.name} (${socket.id})`);
    });

    socket.on("message:send", (message) => {
      const messageWithId = {
        ...message,
        id: `msg-${Date.now()}`,
      };

      // --- ▼▼▼ ここから修正 ▼▼▼ ---
      // メッセージを履歴に追加し、上限を超えたら古いものを削除
      messageHistory.push(messageWithId);
      if (messageHistory.length > MAX_HISTORY) {
        messageHistory.shift();
      }
      // 全員に新しいメッセージを通知
      io.emit("message:new", messageWithId);
      // --- ▲▲▲ ここまで修正 ▲▲▲ ---

      console.log(`メッセージ: ${message.content} from ${message.sender}`);
    });

    socket.on("user:move", (position) => {
      const userData = users.get(socket.id);
      if (userData) {
        userData.position = position;
        users.set(socket.id, userData);
        const usersList = Array.from(users.values());
        io.emit("users:update", usersList);
      }
    });

    socket.on("user:typing", (isTyping) => {
      const userData = users.get(socket.id);
      if (userData) {
        socket.broadcast.emit("user:typing", {
          userId: userData.id,
          name: userData.name,
          isTyping,
        });
      }
    });

    socket.on("disconnect", () => {
      const userData = users.get(socket.id);
      if (userData) {
        users.delete(socket.id);

        // 退室メッセージを作成
        const systemMessage = {
          id: `msg-${Date.now()}`,
          type: "system",
          content: `${userData.name} が退室しました`,
          timestamp: new Date().toISOString(),
        };

        // --- ▼▼▼ ここから修正 ▼▼▼ ---
        // メッセージを履歴に追加し、上限を超えたら古いものを削除
        messageHistory.push(systemMessage);
        if (messageHistory.length > MAX_HISTORY) {
          messageHistory.shift();
        }
        // 全員に退室メッセージを通知
        io.emit("message:new", systemMessage);
        // --- ▲▲▲ ここまで修正 ▲▲▲ ---

        const usersList = Array.from(users.values());
        io.emit("users:update", usersList);
        console.log(`切断: ${userData.name} (${socket.id})`);
      }
    });
  });

  server
    .once("error", (err) => {
      console.error("HTTPサーバー起動エラー:", err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });
});
