/**
 * Next.jsカスタムサーバー 兼 Socket.IOサーバー (Realtime Database連携版)
 *
 * このモジュールは、Next.jsアプリケーションのレンダリングを行いながら、
 * Socket.IOサーバーを統合します。チャットメッセージ、ユーザー状態、リアクションなどの
 * データ永続化には、Firebase Realtime Databaseを使用します。
 *
 * 主な機能:
 * - リアルタイムチャットメッセージング（コールバックによる堅牢なログイン処理）
 * - ユーザーの入退室管理と一覧表示
 * - チャット履歴の段階的読み込み（ページネーション）
 * - メッセージへのリアクション機能
 * - メッセージの削除機能（本人・管理者）
 * - 履歴の全削除機能
 * - ユーザーアバターの移動同期
 * - タイピング中の状態表示
 */

// --- 必要なモジュールのインポート ---
import admin from "firebase-admin"; // Firebase Admin SDK
import next from "next"; // Next.jsフレームワーク
import { readFileSync } from "node:fs"; // ファイル読み込み用
import { createServer } from "node:http"; // Node.js標準のHTTPサーバー
import { Server } from "socket.io"; // Socket.IOサーバー

// =================================================================
// --- Firebase Admin SDK の初期化 ---
// =================================================================
try {
  const databaseURL =
    "https://oga-realtime-chat-default-rtdb.asia-southeast1.firebasedatabase.app";

  if (process.env.NODE_ENV === "production") {
    admin.initializeApp({
      databaseURL: databaseURL,
    });
    console.log(
      "✅ Firebase Admin SDK initialized for PRODUCTION environment using default credentials."
    );
  } else {
    const serviceAccountPath = new URL(
      "./serviceAccountKey.json",
      import.meta.url
    );
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: databaseURL,
    });
    console.log(
      "✅ Firebase Admin SDK initialized for DEVELOPMENT environment."
    );
  }
} catch (error) {
  console.error("❌ Firebase Admin SDK initialization failed:", error.message);
  if (error.code === "ENOENT") {
    console.error(
      "-> HINT: Ensure 'serviceAccountKey.json' is in the project root for local development."
    );
  }
  process.exit(1);
}

// =================================================================
// --- グローバル変数と定数の定義 ---
// =================================================================

const db = admin.database();
const messagesRef = db.ref("messages");
const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;
const app = next({ dev });
const handle = app.getRequestHandler();
const users = new Map();
const HISTORY_LIMIT_PER_FETCH = 50; // 1回あたりの取得件数

// =================================================================
// --- サーバーの起動とリクエスト処理 ---
// =================================================================
app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    pingInterval: 25000,
    pingTimeout: 60000,
    cors: {
      origin: "https://oga-realtime-chat.web.app", // ★ 本番フロントエンドのURLを許可
      methods: ["GET", "POST"], // ★ 許可するHTTPメソッド
    },
  });

  io.engine.on("connection_error", (err) => {
    console.log("Connection error occurred:", err);
  });

  // =================================================================
  // --- Realtime Database の変更監視リスナー ---
  // =================================================================

  messagesRef.on("child_changed", (snapshot) => {
    const updatedMessage = snapshot.val();
    if (updatedMessage) {
      io.emit("reaction:update", {
        messageId: snapshot.key,
        reactions: updatedMessage.reactions || {},
      });
    }
  });

  messagesRef.on("child_removed", (snapshot) => {
    io.emit("message:deleted", { messageId: snapshot.key });
  });

  // =================================================================
  // --- Socket.IO の接続イベントハンドラ ---
  // =================================================================
  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on("user:check_name", (username, callback) => {
      const isTaken = Array.from(users.values()).some(
        (u) => u.name === username
      );
      if (isTaken) {
        callback({
          available: false,
          message: "この表示名は既に使用されています。",
        });
      } else {
        callback({ available: true });
      }
    });

    socket.on("user:login", async (userData) => {
      const currentUser = { ...userData, id: socket.id };
      users.set(socket.id, currentUser);

      // ▼▼▼ 過去のチャット履歴をDBから取得（初回読み込み用）▼▼▼
      try {
        const snapshot = await messagesRef
          .orderByChild("timestamp")
          .limitToLast(HISTORY_LIMIT_PER_FETCH + 1) // hasMore判定のため+1件取得
          .once("value");

        const historyData = snapshot.val();
        let history = [];
        let hasMore = false;
        if (historyData) {
          const allMessages = Object.entries(historyData).map(([id, msg]) => ({
            id,
            ...msg,
          }));
          allMessages.sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          );

          if (allMessages.length > HISTORY_LIMIT_PER_FETCH) {
            hasMore = true;
            history = allMessages.slice(1); // 判定用の1件を除外
          } else {
            hasMore = false;
            history = allMessages;
          }
        }

        socket.emit("user:login_success", currentUser);
        socket.emit("chat:history", { history, hasMore }); // hasMoreフラグも送信

        console.log(
          `  📜 Sent initial ${history.length} history messages to ${currentUser.name} (hasMore: ${hasMore})`
        );
      } catch (error) {
        console.error("  ❌ Error fetching initial chat history:", error);
        socket.emit("user:login_success", currentUser);
        socket.emit("chat:history", { history: [], hasMore: false });
      }
      // ▲▲▲ 初回履歴取得のロジックを修正 ▲▲▲

      // --- 入室メッセージをDBに保存し、全員に通知 ---
      const systemMessage = {
        type: "system",
        systemType: "join", // ★ systemTypeを追加
        sender: "System",
        content: `${currentUser.name} が入室しました`,
        timestamp: new Date().toISOString(),
        reactions: {},
      };
      try {
        const newMessageRef = messagesRef.push();
        await newMessageRef.set(systemMessage);
        const savedMessage = { id: newMessageRef.key, ...systemMessage };
        io.emit("message:new", savedMessage);
      } catch (error) {
        console.error("  ❌ Error saving join message:", error);
      }

      // 全クライアントに最新のユーザーリストを送信
      io.emit("users:update", Array.from(users.values()));
      console.log(`✅ User logged in: ${currentUser.name} (${socket.id})`);
    });

    // ▼▼▼ 過去ログを遡って取得するためのハンドラを新設 ▼▼▼
    socket.on("fetch:history", async ({ cursor }) => {
      try {
        const snapshot = await messagesRef
          .orderByChild("timestamp")
          .endBefore(cursor) // cursorのタイムスタンプより前のデータを対象
          .limitToLast(HISTORY_LIMIT_PER_FETCH + 1)
          .once("value");

        const historyData = snapshot.val();
        let history = [];
        let hasMore = false;
        if (historyData) {
          const allMessages = Object.entries(historyData).map(([id, msg]) => ({
            id,
            ...msg,
          }));
          allMessages.sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          );

          if (allMessages.length > HISTORY_LIMIT_PER_FETCH) {
            hasMore = true;
            history = allMessages.slice(1);
          } else {
            hasMore = false;
            history = allMessages;
          }
        }

        socket.emit("history:chunk", { history, hasMore }); // 新しいイベント名で送信

        console.log(
          `  📜 Sent history chunk (${history.length} messages) to ${socket.id} (hasMore: ${hasMore})`
        );
      } catch (error) {
        console.error("  ❌ Error fetching history chunk:", error);
        socket.emit("history:chunk", { history: [], hasMore: false });
      }
    });
    // ▲▲▲ 新しいハンドラ ▲▲▲

    socket.on("message:send", async (message) => {
      const user = users.get(socket.id);
      if (!user) return;
      const messageData = { ...message, reactions: {} };
      if (message.replyTo) {
        try {
          const snapshot = await messagesRef
            .child(message.replyTo)
            .once("value");
          if (snapshot.exists()) {
            const repliedMessage = snapshot.val();
            messageData.replyContext = {
              sender: repliedMessage.sender,
              content: repliedMessage.content,
            };
          }
        } catch (error) {
          console.error("  ❌ Error fetching reply context:", error);
        }
      }
      try {
        const newMessageRef = messagesRef.push();
        await newMessageRef.set(messageData);
        const savedMessage = { id: newMessageRef.key, ...messageData };
        io.emit("message:new", savedMessage);
        console.log(
          `  💬 Message from ${user.name}: ${message.content.substring(
            0,
            30
          )}...`
        );
      } catch (error) {
        console.error("  ❌ Error saving message:", error);
      }
    });

    socket.on("reaction:add", async ({ messageId, emoji }) => {
      const user = users.get(socket.id);
      if (!user) return;
      const reactionRef = db.ref(`messages/${messageId}/reactions/${emoji}`);
      try {
        await reactionRef.transaction((currentReactions) => {
          if (currentReactions === null) return [user.name];
          const userIndex = currentReactions.indexOf(user.name);
          if (userIndex > -1) {
            currentReactions.splice(userIndex, 1);
          } else {
            currentReactions.push(user.name);
          }
          return currentReactions.length > 0 ? currentReactions : undefined;
        });
      } catch (error) {
        console.error("  ❌ Error updating reaction:", error);
      }
    });

    socket.on("message:delete", async ({ messageId }) => {
      const user = users.get(socket.id);
      if (!user) return;
      const messageRef = messagesRef.child(messageId);
      try {
        const snapshot = await messageRef.once("value");
        if (snapshot.exists() && snapshot.val().sender === user.name) {
          await messageRef.remove();
          console.log(`  🗑️ Message ${messageId} deleted by ${user.name}`);
        }
      } catch (error) {
        console.error("  ❌ Error deleting message:", error);
      }
    });

    socket.on("admin:message:delete", async ({ messageId }) => {
      try {
        await messagesRef.child(messageId).remove();
        console.log(`  🛡️ Message ${messageId} deleted by admin.`);
      } catch (error) {
        console.error("  ❌ Error deleting message as admin:", error);
      }
    });

    socket.on("chat:clear_history", async () => {
      const user = users.get(socket.id);
      if (!user) return;
      try {
        await messagesRef.remove();
        const systemMessage = {
          type: "system",
          systemType: "admin", // ★ systemTypeを追加
          sender: "System",
          content: `${user.name} がチャット履歴を全削除しました。`,
          timestamp: new Date().toISOString(),
          reactions: {},
        };
        const newMessageRef = messagesRef.push();
        await newMessageRef.set(systemMessage);
        io.emit("chat:history_cleared", {
          id: newMessageRef.key,
          ...systemMessage,
        });
        console.log(`  💥 Chat history cleared by ${user.name}.`);
      } catch (error) {
        console.error("  ❌ Error clearing history:", error);
      }
    });

    socket.on("user:move", (position) => {
      const userData = users.get(socket.id);
      if (userData) {
        userData.position = position;
        users.set(socket.id, userData);
        io.emit("users:update", Array.from(users.values()));
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

    socket.on("disconnect", async () => {
      const userData = users.get(socket.id);
      if (userData) {
        users.delete(socket.id);
        const systemMessage = {
          type: "system",
          systemType: "leave", // ★ systemTypeを追加
          sender: "System",
          content: `${userData.name} が退室しました`,
          timestamp: new Date().toISOString(),
          reactions: {},
        };
        try {
          const newMessageRef = messagesRef.push();
          await newMessageRef.set(systemMessage);
          io.emit("message:new", { id: newMessageRef.key, ...systemMessage });
        } catch (error) {
          console.error("  ❌ Error saving leave message:", error);
        }
        io.emit("users:update", Array.from(users.values()));
        console.log(`🔌 User disconnected: ${userData.name} (${socket.id})`);
      } else {
        console.log(`🔌 Socket disconnected (no user data): ${socket.id}`);
      }
    });
  });

  // =================================================================
  // --- HTTPサーバーの起動 ---
  // =================================================================
  server
    .once("error", (err) => {
      console.error("❌ HTTP server startup error:", err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`\n🚀 Server ready on http://localhost:${port}`);
    });
});
