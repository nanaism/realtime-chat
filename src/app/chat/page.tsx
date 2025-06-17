"use client";

import ChatInterface from "@/app/chat/_components/chat-interface";
import InfoDialog from "@/app/chat/_components/InfoDialog";
import UserList from "@/app/chat/_components/user-list";
import VirtualSpace from "@/app/chat/_components/virtual-space";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { Message } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { HelpCircle, LogOut, MessageSquare, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useChatSocket } from "./_hooks/use-chat-socket";
import ConnectionError from "./ConnectionError";
import SpaceDiveLoading from "./SpaceDiveLoading";

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- Component State ---
  const [username, setUsername] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [showUserPanel, setShowUserPanel] = useState(false); // Mobile view only
  const [activeTab, setActiveTab] = useState("chat"); // Desktop view tabs
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isLoaderAnimationComplete, setIsLoaderAnimationComplete] =
    useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

  // --- Effects ---

  // 1. ユーザー認証とページ遷移のハンドリング
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    } else {
      // ユーザー名がない場合はログインページにリダイレクト
      router.replace("/");
    }
  }, [router]);

  // 2. 初回アクセス時に機能説明ダイアログを表示
  useEffect(() => {
    // ローディングアニメーションが完了した後にダイアログ表示を試みる
    if (isLoaderAnimationComplete) {
      const hasSeenInfo = sessionStorage.getItem("hasSeenOgaSpaceInfo");
      if (!hasSeenInfo) {
        // ユーザーがUIを認識できるよう、わずかな遅延を設ける
        const timer = setTimeout(() => {
          setIsInfoDialogOpen(true);
          sessionStorage.setItem("hasSeenOgaSpaceInfo", "true");
        }, 500); // 0.5秒後
        return () => clearTimeout(timer);
      }
    }
  }, [isLoaderAnimationComplete]);

  // --- Hooks ---

  // Socket.IO接続とチャット機能のカスタムフック
  const {
    users,
    messages,
    typingUsers,
    connectionStatus,
    errorMessage,
    sendMessage,
    sendTypingUpdate,
    sendUserMove,
    sendReaction,
    deleteMessage,
    deleteMessageAsAdmin,
    clearChatHistory,
    logout,
  } = useChatSocket({ username });

  // --- Memos ---

  // 現在のユーザーのソケットIDを計算
  const currentUserId = useMemo(() => {
    return users.find((user) => user.name === username)?.id || null;
  }, [users, username]);

  // --- Constants ---

  const PURGE_COMMAND = "/!purge_chat_history_absolutely_!/";
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  // --- Handlers ---

  /** メッセージ送信処理 */
  const handleSendMessage = () => {
    if (!inputValue.trim() || !username) return;

    // 管理者モードへの切り替えコマンド
    if (ADMIN_PASSWORD && inputValue === ADMIN_PASSWORD) {
      setIsAdminMode(true);
      setInputValue("");
      alert("管理者モードが有効になりました。");
      return;
    }

    // チャット履歴全削除コマンド
    if (inputValue === PURGE_COMMAND) {
      if (
        window.confirm(
          "本当にすべてのチャット履歴を削除しますか？\nこの操作は元に戻せません。"
        )
      ) {
        clearChatHistory();
        setInputValue("");
      }
      return;
    }

    // 通常のメッセージ送信
    sendMessage(inputValue, replyingTo?.id);
    setInputValue("");
    setReplyingTo(null);
  };

  /** 入力値の変更とタイピング状態の送信 */
  const handleInputChange = (value: string) => {
    setInputValue(value);
    const isTyping = value.trim().length > 0;
    sendTypingUpdate(isTyping);
  };

  /** メッセージ削除処理（管理者モードを考慮） */
  const handleDelete = (messageId: string) => {
    if (isAdminMode) {
      deleteMessageAsAdmin(messageId);
    } else {
      deleteMessage(messageId);
    }
  };

  /** バーチャル空間でのユーザー移動 */
  const handleUserMove = (
    _userId: string,
    newPosition: { x: number; y: number }
  ) => {
    sendUserMove(newPosition);
  };

  /** チャットからの退出処理 */
  const handleLeave = () => {
    logout();
    localStorage.removeItem("username");
    setUsername(null);
    setInputValue("");
    setShowUserPanel(false);
    setActiveTab("chat");
    setIsAdminMode(false);
    router.push("/");
  };

  /** [Mobile] ユーザーパネルの表示切り替え */
  const toggleUserPanel = () => {
    setShowUserPanel((prev) => !prev);
  };

  /** [Desktop] チャット/ユーザーリストのタブ切り替え */
  const switchTab = (tab: string) => {
    setActiveTab(tab);
  };

  // --- Render Logic ---

  // 1. [デバッグ用] URLクエリによる強制エラー表示
  const isDebugErrorMode = searchParams.get("force_error") === "true";
  if (isDebugErrorMode) {
    return <ConnectionError />;
  }

  // 2. 接続エラー時の表示
  if (connectionStatus === "error") {
    return <ConnectionError message={errorMessage} />;
  }

  // 3. ローディング中の表示
  // ユーザー名が未設定、接続未完了、またはローディングアニメーションが未完了の場合
  const showLoader =
    !username || connectionStatus !== "connected" || !isLoaderAnimationComplete;
  if (showLoader) {
    return (
      <SpaceDiveLoading onComplete={() => setIsLoaderAnimationComplete(true)} />
    );
  }

  // 4. 上記の条件をすべてクリアした場合、メインのチャット画面を表示
  return (
    <div className="relative h-screen">
      {/* 機能説明ダイアログ (AnimatePresenceで開閉アニメーションを制御) */}
      <AnimatePresence>
        {isInfoDialogOpen && (
          <InfoDialog onClose={() => setIsInfoDialogOpen(false)} />
        )}
      </AnimatePresence>

      {/* チャットUI全体 */}
      <motion.div
        className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <header className="py-4 px-8 flex items-center justify-between border-b bg-white dark:bg-zinc-900 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🪐</span>
            <h1 className="text-3xl font-bold tracking-tight font-sans">
              <Link
                href="/"
                className="bg-gradient-to-r from-indigo-300 to-purple-700 bg-clip-text text-transparent 
                 relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 
                 after:bg-gradient-to-r after:from-indigo-400 after:to-purple-600 
                 hover:after:w-full after:transition-all after:duration-300 
                 hover:from-indigo-400 hover:to-purple-700 transition-all duration-300"
              >
                Oga Space
              </Link>
            </h1>
            <span className="text-2xl">✨️</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              {users.length} 人参加中
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsInfoDialogOpen(true)}
              className="rounded-full text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-label="ヘルプ"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* 左側のバーチャル空間 (Desktop) */}
          <div className="hidden md:block md:w-1/2 lg:w-4/5 border-r dark:border-slate-800">
            <VirtualSpace
              users={users}
              currentUser={currentUserId || ""}
              onUserMove={handleUserMove}
              typingUsers={typingUsers}
            />
          </div>

          {/* 右側のチャットUI */}
          <div className="flex flex-col w-full md:w-1/2 lg:w-2/5">
            <div className="flex-1 overflow-hidden">
              {/* Desktop View (Tabs) */}
              <div className="hidden md:block h-full">
                <Tabs value={activeTab} className="h-full">
                  <TabsContent value="chat" className="h-full m-0 p-0">
                    <ChatInterface
                      messages={messages}
                      typingUsers={typingUsers}
                      currentUser={username!} // この時点ではusernameはnullではない
                      inputValue={inputValue}
                      setInputValue={handleInputChange}
                      onSendMessage={handleSendMessage}
                      onSendReaction={sendReaction}
                      isAdminMode={isAdminMode}
                      onDeleteMessage={handleDelete}
                      replyingTo={replyingTo}
                      setReplyingTo={setReplyingTo}
                    />
                  </TabsContent>
                  <TabsContent value="users" className="h-full m-0 p-0">
                    <UserList users={users} typingUsers={typingUsers} />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Mobile View (No Tabs) */}
              <div className="md:hidden h-full">
                <ChatInterface
                  messages={messages}
                  typingUsers={typingUsers}
                  currentUser={username!} // この時点ではusernameはnullではない
                  inputValue={inputValue}
                  setInputValue={handleInputChange}
                  onSendMessage={handleSendMessage}
                  onSendReaction={sendReaction}
                  isAdminMode={isAdminMode}
                  onDeleteMessage={handleDelete}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                />
              </div>
            </div>

            {/* Mobile View User Panel (Conditional) */}
            <div
              className={`md:hidden border-t dark:border-slate-800 ${
                showUserPanel ? "block" : "hidden"
              }`}
            >
              <UserList users={users} typingUsers={typingUsers} />
            </div>
          </div>
        </div>

        <footer className="border-t border-gray-200 dark:border-slate-800 py-4 px-8 bg-white dark:bg-slate-900 flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            表示名： <span className="font-medium">{username}</span>
          </div>
          <div className="flex space-x-3">
            {/* Desktop Tab Buttons */}
            <div className="hidden md:flex space-x-2">
              <Button
                variant={activeTab === "chat" ? "default" : "outline"}
                size="sm"
                onClick={() => switchTab("chat")}
                className="flex items-center gap-2 px-3 py-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline font-sans">チャット</span>
              </Button>
              <Button
                variant={activeTab === "users" ? "default" : "outline"}
                size="sm"
                onClick={() => switchTab("users")}
                className="flex items-center gap-2 px-3 py-2 font-sans"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline font-sans">
                  参加人数 ({users.length})
                </span>
              </Button>
            </div>

            {/* Mobile Panel Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleUserPanel}
              className="flex items-center gap-2 px-3 py-2 md:hidden"
            >
              <Users className="h-4 w-4" />
            </Button>

            {/* Leave Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLeave}
              className="flex items-center gap-2 px-3 py-2"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}
