/**
 * Next.jsカスタムサーバー 兼 Socket.IOサーバー (Firestore連携版)
 *
 * このモジュールは、Next.jsアプリケーションを提供し、Socket.IOを統合して
 * リアルタイム通信機能を実現します。チャット履歴の永続化には
 * Google Cloud Firestoreを使用しています。
 */
import admin from "firebase-admin";
import next from "next";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { Server } from "socket.io";

// --- Firebase Admin SDKの初期化 ---
try {
  // GAEなどの本番環境では、環境変数から自動で認証情報を取得
  if (process.env.NODE_ENV === "production") {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log("Firebase Admin SDK initialized for PRODUCTION.");
  } else {
    // ローカル開発環境では、サービスアカウントキーファイルを直接読み込む
    const serviceAccountPath = new URL(
      "./serviceAccountKey.json",
      import.meta.url
    );
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized for DEVELOPMENT.");
  }
} catch (error) {
  console.error("Firebase Admin SDK initialization failed:", error.message);
  if (error.code === "ENOENT") {
    console.error(
      "-> Ensure 'serviceAccountKey.json' is in the project root directory for local development."
    );
  }
  process.exit(1); // 初期化失敗時はサーバーを起動しない
}

// Firestoreのインスタンスを取得し、使用するコレクションを定義
const db = admin.firestore();
const messagesCollection = db.collection("messages");

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;

const app = next({ dev });
const handle = app.getRequestHandler();

// 接続中のユーザー情報はサーバーメモリで管理（DBアクセスを減らすため）
const users = new Map();

// ログイン時に取得する履歴の件数を定義
const HISTORY_LIMIT = 10000;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    // ネットワークが不安定な場合でも接続を維持しやすくするための設定
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  io.engine.on("connection_error", (err) => {
    console.log("Connection error:", err);
  });

  // 新規クライアント接続時の処理
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    /**
     * ユーザー名が使用済みかチェックする
     */
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

    /**
     * ユーザーログイン処理
     */
    socket.on("user:login", async (userData) => {
      // 既に同じ名前のユーザーがログインしている場合はエラーを返す
      const isTaken = Array.from(users.values()).some(
        (u) => u.name === userData.name
      );
      if (isTaken) {
        socket.emit("user:login_error", {
          message:
            "この表示名は他のタブまたはウィンドウで既に使用されています。",
        });
        return;
      }

      // ユーザー情報をメモリに保存
      const currentUser = { ...userData, id: socket.id };
      users.set(socket.id, currentUser);

      // Firestoreから最新のチャット履歴を取得して送信
      try {
        const snapshot = await messagesCollection
          .orderBy("timestamp", "desc")
          .limit(HISTORY_LIMIT)
          .get();

        // 取得したドキュメントを配列に変換し、時系列（古い→新しい）に並び替える
        const history = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .reverse();

        socket.emit("user:login_success", currentUser);
        socket.emit("chat:history", history);
        console.log(`Sent ${history.length} messages to ${currentUser.name}`);
      } catch (error) {
        console.error("Error fetching chat history:", error);
        // エラー時もログインは成功させ、空の履歴を送信
        socket.emit("user:login_success", currentUser);
        socket.emit("chat:history", []);
      }

      // 入室システムメッセージを作成し、Firestoreに保存
      const systemMessage = {
        type: "system",
        sender: "System",
        content: `${currentUser.name} が入室しました`,
        timestamp: new Date().toISOString(),
        reactions: {},
      };
      try {
        const docRef = await messagesCollection.add(systemMessage);
        const savedMessage = { id: docRef.id, ...systemMessage };
        io.emit("message:new", savedMessage); // 全クライアントにブロードキャスト
      } catch (error) {
        console.error("Error saving join message:", error);
      }

      // 全クライアントに最新のユーザーリストを送信
      io.emit("users:update", Array.from(users.values()));
      console.log(`User logged in: ${currentUser.name} (${socket.id})`);
    });

    /**
     * 新規メッセージの受信と保存、ブロードキャスト
     */
    socket.on("message:send", async (message) => {
      const user = users.get(socket.id);
      if (!user) return; // 未ログインユーザーからのメッセージは無視

      const messageData = { ...message, reactions: {} };

      // リプライ先の情報があれば、元メッセージを取得してコンテキストを追加
      if (message.replyTo) {
        try {
          const repliedDoc = await messagesCollection
            .doc(message.replyTo)
            .get();
          if (repliedDoc.exists()) {
            const repliedMessage = repliedDoc.data();
            messageData.replyContext = {
              sender: repliedMessage.sender,
              content: repliedMessage.content,
            };
          }
        } catch (error) {
          console.error("Error fetching reply context:", error);
        }
      }

      // メッセージをFirestoreに保存
      try {
        const docRef = await messagesCollection.add(messageData);
        const savedMessage = { id: docRef.id, ...messageData };
        io.emit("message:new", savedMessage); // 全クライアントにブロードキャスト
        console.log(`Message from ${user.name}: ${message.content}`);
      } catch (error) {
        console.error("Error saving message:", error);
      }
    });

    /**
     * リアクションの追加・削除（トグル）
     */
    socket.on("reaction:add", async ({ messageId, emoji }) => {
      const user = users.get(socket.id);
      if (!user) return;

      const messageRef = messagesCollection.doc(messageId);

      try {
        // データの競合を防ぐためトランザクション内で更新
        await db.runTransaction(async (transaction) => {
          const messageDoc = await transaction.get(messageRef);
          if (!messageDoc.exists) throw new Error("Message not found");

          const data = messageDoc.data();
          const reactions = data.reactions || {};
          reactions[emoji] = reactions[emoji] || [];

          const userIndex = reactions[emoji].indexOf(user.name);
          if (userIndex > -1) {
            reactions[emoji].splice(userIndex, 1); // 既にあれば削除
            if (reactions[emoji].length === 0) delete reactions[emoji];
          } else {
            reactions[emoji].push(user.name); // なければ追加
          }

          transaction.update(messageRef, { reactions });
        });

        // 更新後のリアクション情報を全クライアントに通知
        const updatedDoc = await messageRef.get();
        io.emit("reaction:update", {
          messageId,
          reactions: updatedDoc.data().reactions || {},
        });
      } catch (error) {
        console.error("Error updating reaction:", error);
      }
    });

    /**
     * 投稿者本人によるメッセージ削除
     */
    socket.on("message:delete", async ({ messageId }) => {
      const user = users.get(socket.id);
      if (!user) return;

      const messageRef = messagesCollection.doc(messageId);
      try {
        const doc = await messageRef.get();
        if (!doc.exists) return;

        // 本人確認
        const message = doc.data();
        if (message.sender === user.name) {
          await messageRef.delete();
          io.emit("message:deleted", { messageId });
          console.log(`Message ${messageId} deleted by ${user.name}`);
        } else {
          console.log(
            `Unauthorized delete attempt by ${user.name} on message ${messageId}`
          );
        }
      } catch (error) {
        console.error("Error deleting message:", error);
      }
    });

    /**
     * 管理者権限によるメッセージ削除
     */
    socket.on("admin:message:delete", async ({ messageId }) => {
      const user = users.get(socket.id);
      if (!user) return;
      // TODO: ここで管理者かどうかを判定するロジックを追加（例: if (user.name !== 'admin') return;）

      try {
        await messagesCollection.doc(messageId).delete();
        io.emit("message:deleted", { messageId });
        console.log(`Message ${messageId} deleted by admin ${user.name}`);
      } catch (error) {
        console.error("Error deleting message as admin:", error);
      }
    });

    /**
     * チャット履歴の全削除（高コストなため注意）
     */
    socket.on("chat:clear_history", async () => {
      const user = users.get(socket.id);
      if (!user) return;
      // TODO: 管理者のみ実行可能にするべき

      console.log(`History clear requested by ${user.name}. Processing...`);
      try {
        // Firestoreの全ドキュメントを効率的に削除するのは複雑なため、
        // ここではバッチ処理で削除。大規模コレクションには非推奨。
        const snapshot = await messagesCollection.limit(500).get(); // 一度に削除する上限
        if (snapshot.empty) {
          console.log("No messages to delete.");
          return;
        }
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        // 削除通知メッセージを保存・送信
        const systemMessage = {
          type: "system",
          sender: "System",
          content: `${user.name} がチャット履歴を全削除しました。`,
          timestamp: new Date().toISOString(),
          reactions: {},
        };
        const docRef = await messagesCollection.add(systemMessage);
        io.emit("chat:history_cleared", { id: docRef.id, ...systemMessage });
        console.log("Chat history cleared.");
      } catch (error) {
        console.error("Error clearing history:", error);
      }
    });

    /**
     * ユーザーのアバター移動情報のブロードキャスト
     */
    socket.on("user:move", (position) => {
      const userData = users.get(socket.id);
      if (userData) {
        userData.position = position;
        users.set(socket.id, userData);
        io.emit("users:update", Array.from(users.values()));
      }
    });

    /**
     * タイピング中ステータスのブロードキャスト
     */
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

    /**
     * クライアント切断時の処理
     */
    socket.on("disconnect", async () => {
      const userData = users.get(socket.id);
      if (userData) {
        users.delete(socket.id);

        // 退室システムメッセージをFirestoreに保存
        const systemMessage = {
          type: "system",
          sender: "System",
          content: `${userData.name} が退室しました`,
          timestamp: new Date().toISOString(),
          reactions: {},
        };
        try {
          const docRef = await messagesCollection.add(systemMessage);
          io.emit("message:new", { id: docRef.id, ...systemMessage });
        } catch (error) {
          console.error("Error saving leave message:", error);
        }

        // 最新のユーザーリストを全クライアントに送信
        io.emit("users:update", Array.from(users.values()));
        console.log(`User disconnected: ${userData.name} (${socket.id})`);
      } else {
        console.log(`Socket disconnected (no user data): ${socket.id}`);
      }
    });
  });

  server.listen(port, () => {
    console.log(`> Server ready on http://localhost:${port}`);
  });
});
