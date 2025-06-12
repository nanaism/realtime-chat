import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "./types";

// 環境変数から接続先URLを取得する
// process.env.NEXT_PUBLIC_WS_URL があればそれを使う
// なければ、現在のページのホストに接続を試みる
const URL = process.env.NEXT_PUBLIC_WS_URL;

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  URL, // 環境変数で指定されたURLに接続
  {
    autoConnect: true, // 自動で接続を開始する
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  }
);
