/**
 * Next.jsカスタムサーバー兼Socket.IOサーバー
 *
 * このモジュールは、Next.jsアプリケーションを提供し、Socket.IOを統合して
 * リアルタイム通信機能（チャット、ユーザー状態同期など）を実現します。
 * チャット履歴機能とリアクション機能も備えています。
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

// チャット履歴を保持する配列
const messageHistory = [];
// メモリを圧迫しないよう、保持する履歴の最大数を設定 (例: 100件)
const MAX_HISTORY = 10000;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // Socket.IOサーバーの初期化部分を修正
  const io = new Server(server, {
    // ▼▼▼ タイムアウト設定を追加 ▼▼▼
    // 目的: ネットワークの揺らぎやブラウザのバックグラウンド動作による
    // 意図しない切断を防ぎ、接続をより安定させるため。
    pingInterval: 25000, // 25秒ごとに生存確認のpingを送信 (デフォルト値のままですが、明記しておくと分かりやすいです)
    pingTimeout: 60000, // ping送信後、クライアントからのpong応答を60秒待ちます（デフォルトは20秒）。
    // この時間を伸ばすことで、一時的な無応答で切断されにくくなります。
    // ▲▲▲ ここまで追加 ▲▲▲
  });

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

    // ▼▼▼ user:login のロジックを修正 ▼▼▼
    socket.on("user:login", (userData) => {
      console.log("ログインデータ受信:", userData);

      const existingUser = Array.from(users.values()).find(
        (u) => u.name === userData.name
      );

      // ★★★ 重複ユーザーの処理を変更 ★★★
      if (existingUser) {
        console.log(
          `ユーザー "${userData.name}" は既に接続済みです。新しい接続 (${socket.id}) を拒否します。`
        );
        // 新しい接続元（このソケット）にのみエラーイベントを送信
        socket.emit("user:login_error", {
          message:
            "この表示名は他のタブまたはウィンドウで既に使用されています。",
        });
        // この後の処理は行わず、ユーザーをリストに追加しない
        return;
      }

      // --- ここから下は、重複がない場合の正常な処理 ---

      const updatedUserData = {
        ...userData,
        id: socket.id,
      };
      users.set(socket.id, updatedUserData);

      console.log(
        `履歴を送信: ${socket.id} へ ${messageHistory.length} 件のメッセージ`
      );
      // ログインが成功した本人に、成功したことと履歴を送信
      socket.emit("user:login_success", updatedUserData);
      socket.emit("chat:history", messageHistory);

      // 入室メッセージを作成
      const systemMessage = {
        id: `msg-${Date.now()}`,
        type: "system",
        sender: "System",
        content: `${updatedUserData.name} が入室しました`,
        timestamp: new Date().toISOString(),
        reactions: {},
      };

      messageHistory.push(systemMessage);
      if (messageHistory.length > MAX_HISTORY) {
        messageHistory.shift();
      }
      // 全員に入室メッセージを送信
      io.emit("message:new", systemMessage);

      // 全員にユーザーリストの更新を通知
      const usersList = Array.from(users.values());
      io.emit("users:update", usersList);

      console.log(`ログイン成功: ${updatedUserData.name} (${socket.id})`);
    });

    socket.on("message:send", (message) => {
      const messageWithId = {
        ...message,
        id: `msg-${Date.now()}`,
        reactions: {},
      };

      // ▼▼▼ リプライ処理を追加 ▼▼▼
      // クライアントから replyTo (リプライ先のID) が送られてきた場合
      if (message.replyTo) {
        // 履歴からリプライ元のメッセージを検索
        const repliedToMessage = messageHistory.find(
          (m) => m.id === message.replyTo
        );

        // 見つかった場合、そのコンテキスト（送信者と内容）を新しいメッセージに含める
        if (repliedToMessage && repliedToMessage.type === "user") {
          messageWithId.replyContext = {
            sender: repliedToMessage.sender,
            content: repliedToMessage.content,
          };
        }
      }
      // ▲▲▲ リプライ処理を追加 ▲▲▲

      messageHistory.push(messageWithId);
      if (messageHistory.length > MAX_HISTORY) {
        messageHistory.shift();
      }
      io.emit("message:new", messageWithId);

      console.log(`メッセージ: ${message.content} from ${message.sender}`);
    });

    // ▼▼▼ ここからリアクション処理のロジックを丸ごと追加 ▼▼▼
    socket.on("reaction:add", ({ messageId, emoji }) => {
      const user = users.get(socket.id);
      if (!user) return;

      const message = messageHistory.find((m) => m.id === messageId);
      if (!message) return;

      // reactions オブジェクトがなければ初期化
      if (!message.reactions) {
        message.reactions = {};
      }
      // 絵文字キーがなければ初期化
      if (!message.reactions[emoji]) {
        message.reactions[emoji] = [];
      }

      const userIndex = message.reactions[emoji].indexOf(user.name);

      if (userIndex > -1) {
        // ユーザーが既にリアクションしていれば、削除（トグル）
        message.reactions[emoji].splice(userIndex, 1);
        // リアクションしたユーザーがいなくなったら、絵文字キー自体を削除
        if (message.reactions[emoji].length === 0) {
          delete message.reactions[emoji];
        }
      } else {
        // ユーザーがまだリアクションしていなければ、追加
        message.reactions[emoji].push(user.name);
      }

      console.log(
        `Reaction update: ${user.name} reacted with ${emoji} to message ${messageId}`
      );

      // 全クライアントに更新情報をブロードキャスト
      io.emit("reaction:update", {
        messageId: messageId,
        reactions: message.reactions,
      });
    });
    // ▲▲▲ ここまで追加 ▲▲▲

    /**
     * 個別メッセージ削除リクエストの処理
     */
    socket.on("message:delete", ({ messageId }) => {
      const user = users.get(socket.id);
      if (!user) return; // ユーザー情報がない場合は何もしない

      const messageIndex = messageHistory.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return; // メッセージが見つからない

      const messageToDelete = messageHistory[messageIndex];

      // メッセージの投稿者本人か、またはシステムメッセージでないことを確認
      if (
        messageToDelete.type === "user" &&
        messageToDelete.sender === user.name
      ) {
        // messageHistory からメッセージを削除
        messageHistory.splice(messageIndex, 1);

        // 全クライアントに削除を通知
        io.emit("message:deleted", { messageId });
        console.log(`メッセージ削除: ${messageId} by ${user.name}`);
      } else {
        // 権限がない場合（ログ出力のみ）
        console.log(
          `不正な削除リクエスト: ${user.name} が ${messageToDelete.sender} のメッセージ(${messageId})を削除しようとしました`
        );
      }
    });

    // ▼▼▼ 変更点: 管理者用のメッセージ削除イベントハンドラを追加 ▼▼▼
    /**
     * 管理者によるメッセージ削除リクエストの処理
     */
    socket.on("admin:message:delete", ({ messageId }) => {
      const user = users.get(socket.id);
      if (!user) return; // ユーザー情報がない場合は何もしない

      // 管理者モードの削除では、誰がリクエストしたかのチェックは行わない
      const messageIndex = messageHistory.findIndex((m) => m.id === messageId);
      if (messageIndex !== -1) {
        // messageHistory からメッセージを削除
        messageHistory.splice(messageIndex, 1);

        // 全クライアントに削除を通知
        io.emit("message:deleted", { messageId });
        console.log(`管理者によるメッセージ削除: ${messageId} by ${user.name}`);
      } else {
        console.log(
          `管理者による削除リクエスト失敗: メッセージが見つかりません (${messageId}) by ${user.name}`
        );
      }
    });
    // ▲▲▲ 変更点 ▲▲▲

    /**
     * 全履歴削除リクエストの処理（裏コマンド用）
     */
    socket.on("chat:clear_history", () => {
      const user = users.get(socket.id);
      if (!user) return;

      // 履歴を空にする
      messageHistory.length = 0;

      // 全削除を通知するシステムメッセージを作成
      const systemMessage = {
        id: `msg-${Date.now()}`,
        type: "system",
        sender: "System",
        content: `${user.name} がチャット履歴を全削除しました。`,
        timestamp: new Date().toISOString(),
        reactions: {},
      };

      // 新しいシステムメッセージを履歴に追加
      messageHistory.push(systemMessage);

      // 全クライアントに履歴がクリアされたことを、新しいシステムメッセージと共に通知
      io.emit("chat:history_cleared", systemMessage);
      console.log(`チャット履歴が ${user.name} によって全削除されました。`);
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
          sender: "System",
          content: `${userData.name} が退室しました`,
          timestamp: new Date().toISOString(),
          reactions: {},
        };

        messageHistory.push(systemMessage);
        if (messageHistory.length > MAX_HISTORY) {
          messageHistory.shift();
        }
        // ★★★ 変更: 全員に退室メッセージを送信 ★★★
        // (以前の実装だと自分自身に送れないが、disconnectなのでこれでOK)
        io.emit("message:new", systemMessage);

        const usersList = Array.from(users.values());
        io.emit("users:update", usersList);
        console.log(`切断: ${userData.name} (${socket.id})`);
      } else {
        // login前に切断された場合など
        console.log(`切断 (ユーザー情報なし): ${socket.id}`);
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
