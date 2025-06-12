/**
 * Socket.IOクライアント設定モジュール
 *
 * このモジュールは、アプリケーション全体で使用されるSocket.IOクライアントの
 * インスタンスを初期化し、提供します。
 * サーバーとのリアルタイム通信を管理します。
 */

import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "./types";

// 環境に応じてURLを設定
const URL =
  process.env.NODE_ENV === "production"
    ? undefined // 本番環境では自動でホストされているサーバーに自動的に接続させる
    : "http://localhost:3000";

/**
 * グローバルSocket.IOクライアントインスタンス
 *
 * アプリケーションの起動時に初期化され、サーバーとの接続を試みます。
 * 再接続ロジックも含まれています。
 */
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  URL,
  {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  }
);
