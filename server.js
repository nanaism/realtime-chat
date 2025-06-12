/**
 * Next.jsカスタムサーバー兼Socket.IOサーバー
 *
 * このモジュールは、Next.jsアプリケーションを提供し、Socket.IOを統合して
 * リアルタイム通信機能（チャット、ユーザー状態同期など）を実現します。
 */
import next from "next";
import { createServer } from "node:http";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

// Next.jsアプリケーションの初期化
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// 接続中のユーザー情報を保持するMapオブジェクト
// キー: socket.id, 値: ユーザー情報 (User型オブジェクト)
const users = new Map();

app.prepare().then(() => {
  const server = createServer(handle);
  const io = new Server(server);

  // デバッグ用：接続状態の監視
  io.engine.on("connection_error", (err) => {
    console.log("Connection error:", err);
  });

  // Socket.IO接続ハンドラー
  io.on("connection", (socket) => {
    console.log(`接続確立: ${socket.id}`);

    // ユーザーがログインした際の処理
    socket.on("user:login", (userData) => {
      console.log("ログインデータ受信:", userData);

      // サーバー側でsocket.idをユーザーIDとして正式に割り当てる
      const updatedUserData = {
        ...userData,
        id: socket.id,
      };

      // ユーザー情報をMapに保存
      users.set(socket.id, updatedUserData);

      // 新規ユーザーの入室を全クライアントに通知 (システムメッセージ)
      io.emit("message:new", {
        id: `msg-${Date.now()}`,
        type: "system",
        content: `${updatedUserData.name} が入室しました`,
        timestamp: new Date().toISOString(),
      });

      // 接続中のユーザー一覧を全クライアントに送信
      const usersList = Array.from(users.values());
      io.emit("users:update", usersList);

      console.log(`ログイン: ${updatedUserData.name} (${socket.id})`);
      console.log(`現在のユーザー数: ${users.size}`);
      console.log("ユーザーリスト:", usersList);
    });

    // クライアントからチャットメッセージを受信した際の処理
    socket.on("message:send", (message) => {
      const messageWithId = {
        ...message,
        id: `msg-${Date.now()}`,
      };

      // 全クライアントにメッセージをブロードキャスト
      io.emit("message:new", messageWithId);

      console.log(`メッセージ: ${message.content} from ${message.sender}`);
    });

    // クライアントからユーザーの位置情報更新を受信した際の処理
    socket.on("user:move", (position) => {
      // 該当ユーザーの情報を取得・更新
      const userData = users.get(socket.id);
      if (userData) {
        userData.position = position;
        users.set(socket.id, userData);

        // 更新された位置情報を全クライアントに送信
        const usersList = Array.from(users.values());
        io.emit("users:update", usersList);
        console.log(
          `ユーザー移動: ${userData.name} to (${position.x}, ${position.y})`
        );
      } else {
        console.log(`移動エラー: ユーザーが見つかりません (${socket.id})`);
      }
    });

    // クライアントからタイピング状態の通知を受信した際の処理
    socket.on("user:typing", (isTyping) => {
      const userData = users.get(socket.id);
      if (userData) {
        // 送信者以外の全クライアントにタイピング状態をブロードキャスト
        socket.broadcast.emit("user:typing", {
          userId: userData.id,
          name: userData.name,
          isTyping,
        });
      }
    });

    // クライアントとの接続が切断された際の処理
    socket.on("disconnect", () => {
      const userData = users.get(socket.id);

      if (userData) {
        // ユーザー情報をMapから削除
        users.delete(socket.id);

        // ユーザーの退室を全クライアントに通知 (システムメッセージ)
        io.emit("message:new", {
          id: `msg-${Date.now()}`,
          type: "system",
          content: `${userData.name} が退室しました`,
          timestamp: new Date().toISOString(),
        });

        // 更新されたユーザー一覧を送信
        const usersList = Array.from(users.values());
        io.emit("users:update", usersList);

        console.log(`切断: ${userData.name} (${socket.id})`);
        console.log(`現在のユーザー数: ${users.size}`);
        console.log("ユーザーリスト:", usersList);
      }
    });
  });

  server
    .once("error", (err) => {
      console.error("HTTPサーバー起動エラー:", err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> サーバー起動: http://${hostname}:${port}`);
    });
});
