// server.js (修正後)

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
// App Engineから指定されるポート、なければ開発用に3000を使用
const port = process.env.PORT || 3000;

// Next.jsアプリケーションの初期化
// App Engine上ではホスト名を指定しない
const app = next({ dev });
const handle = app.getRequestHandler();

// 接続中のユーザー情報を保持するMapオブジェクト
// キー: socket.id, 値: ユーザー情報 (User型オブジェクト)
const users = new Map();

app.prepare().then(() => {
  // ★ 変更点: Next.jsのハンドラーをcreateServerに直接渡すのではなく、
  // リクエストをパースして渡す、より標準的な方法に変更します。
  const server = createServer((req, res) => {
    // URLをパースしてNext.jsに処理を委譲
    handle(req, res);
  });

  const io = new Server(server, {
    // 必要に応じてSocket.IOのオプションをここに記述
  });

  // --- ここから下のSocket.IO関連のロジックは変更ありません ---

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

      const updatedUserData = {
        ...userData,
        id: socket.id,
      };
      users.set(socket.id, updatedUserData);

      io.emit("message:new", {
        id: `msg-${Date.now()}`,
        type: "system",
        content: `${updatedUserData.name} が入室しました`,
        timestamp: new Date().toISOString(),
      });

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
      io.emit("message:new", messageWithId);
      console.log(`メッセージ: ${message.content} from ${message.sender}`);
    });

    // クライアントからユーザーの位置情報更新を受信した際の処理
    socket.on("user:move", (position) => {
      const userData = users.get(socket.id);
      if (userData) {
        userData.position = position;
        users.set(socket.id, userData);
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
        users.delete(socket.id);
        io.emit("message:new", {
          id: `msg-${Date.now()}`,
          type: "system",
          content: `${userData.name} が退室しました`,
          timestamp: new Date().toISOString(),
        });
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
    // ★ 変更点: ホスト名を指定せず、環境変数から取得したポートでリッスン
    .listen(port, () => {
      // ログ出力を環境に合わせて変更
      console.log(`> Ready on http://localhost:${port}`);
    });
});
