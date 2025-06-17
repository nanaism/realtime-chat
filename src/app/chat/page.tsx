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
import { useCallback, useEffect, useMemo, useState } from "react";
import { useChatSocket } from "./_hooks/use-chat-socket";
import ConnectionError from "./ConnectionError";
import SpaceDiveLoading from "./SpaceDiveLoading";

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- Component State ---
  const [username, setUsername] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [isPageTimedOut, setIsPageTimedOut] = useState(false);

  // --- Effects ---
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    } else {
      router.replace("/");
    }
  }, [router]);

  // --- Hooks ---
  const {
    users,
    messages,
    typingUsers,
    connectionStatus,
    errorMessage,
    hasMoreMessages,
    isFetchingHistory,
    fetchHistory,
    sendMessage,
    sendTypingUpdate,
    sendUserMove,
    sendReaction,
    deleteMessage,
    deleteMessageAsAdmin,
    clearChatHistory,
    logout,
  } = useChatSocket({ username });

  useEffect(() => {
    if (!username || connectionStatus !== "connecting" || isPageTimedOut) {
      return;
    }
    const pageTimeoutId = setTimeout(() => {
      console.error(
        "[ChatPage] Page-level timeout reached. Forcing error view."
      );
      setIsPageTimedOut(true);
    }, 8000);

    return () => clearTimeout(pageTimeoutId);
  }, [username, connectionStatus, isPageTimedOut]);

  useEffect(() => {
    if (connectionStatus === "connected") {
      const hasSeenInfo = sessionStorage.getItem("hasSeenOgaSpaceInfo");
      if (!hasSeenInfo) {
        const timer = setTimeout(() => {
          setIsInfoDialogOpen(true);
          sessionStorage.setItem("hasSeenOgaSpaceInfo", "true");
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [connectionStatus]);

  // --- Memos ---
  const currentUserId = useMemo(() => {
    return users.find((user) => user.name === username)?.id || null;
  }, [users, username]);

  // --- Constants ---
  const PURGE_COMMAND = process.env.NEXT_PUBLIC_PURGE_COMMAND;
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  // --- Handlers (useCallbackでメモ化) ---
  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim() || !username) return;

    if (ADMIN_PASSWORD && inputValue === ADMIN_PASSWORD) {
      setIsAdminMode(true);
      setInputValue("");
      alert("管理者モードが有効になりました。");
      return;
    }
    if (inputValue === PURGE_COMMAND) {
      if (
        window.confirm(
          "本当にすべてのチャット履歴を削除しますか？\nこの操作は元に戻せません。"
        )
      ) {
        clearChatHistory();
      }
      setInputValue("");
      return;
    }

    sendMessage(inputValue, replyingTo?.id);
    setInputValue("");
    setReplyingTo(null);
  }, [
    inputValue,
    username,
    ADMIN_PASSWORD,
    PURGE_COMMAND,
    sendMessage,
    replyingTo?.id,
    clearChatHistory,
  ]);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      const isTyping = value.trim().length > 0;
      sendTypingUpdate(isTyping);
    },
    [sendTypingUpdate]
  );

  const handleDelete = useCallback(
    (messageId: string) => {
      if (isAdminMode) {
        deleteMessageAsAdmin(messageId);
      } else {
        deleteMessage(messageId);
      }
    },
    [isAdminMode, deleteMessageAsAdmin, deleteMessage]
  );

  const handleUserMove = useCallback(
    (_userId: string, newPosition: { x: number; y: number }) => {
      sendUserMove(newPosition);
    },
    [sendUserMove]
  );

  const handleLoadMore = useCallback(() => {
    if (!isFetchingHistory) {
      fetchHistory();
    }
  }, [isFetchingHistory, fetchHistory]);

  const handleLeave = useCallback(() => {
    logout();
    localStorage.removeItem("username");
    setUsername(null);
    router.push("/");
  }, [logout, router]);

  const toggleUserPanel = () => setShowUserPanel((prev) => !prev);
  const switchTab = (tab: string) => setActiveTab(tab);

  // --- Render Logic ---

  const isDebugErrorMode = searchParams.get("force_error") === "true";
  if (isDebugErrorMode || connectionStatus === "error" || isPageTimedOut) {
    const finalErrorMessage = isPageTimedOut
      ? "サーバーへの接続がタイムアウトしました。"
      : errorMessage;
    return <ConnectionError message={finalErrorMessage} />;
  }

  const isLoading = !username || connectionStatus !== "connected";

  return (
    <div className="relative h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <AnimatePresence>
        {isInfoDialogOpen && (
          <InfoDialog onClose={() => setIsInfoDialogOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>{isLoading && <SpaceDiveLoading />}</AnimatePresence>

      {/* 
        メインUIは isLoading フラグでアンマウントされないようにする。
        代わりに opacity と pointerEvents で表示/非表示と操作可否を制御する。
        これにより、接続が一時的に切れても入力中のテキストは消えない。
      */}
      <motion.div
        className="flex flex-col h-full"
        animate={{
          opacity: isLoading ? 0 : 1,
          pointerEvents: isLoading ? "none" : "auto",
        }}
        transition={{ duration: 0.3 }}
      >
        <header className="py-4 px-8 flex items-center justify-between border-b bg-white dark:bg-zinc-900 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🪐</span>
            <h1 className="text-3xl font-bold tracking-tight font-sans">
              <Link
                href="/"
                className="bg-gradient-to-r from-indigo-300 to-purple-700 bg-clip-text text-transparent relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-indigo-400 after:to-purple-600 hover:after:w-full after:transition-all after:duration-300 hover:from-indigo-400 hover:to-purple-700 transition-all duration-300"
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
          <div className="hidden md:block md:w-1/2 lg:w-4/5 border-r dark:border-slate-800">
            <VirtualSpace
              users={users}
              currentUser={currentUserId || ""}
              onUserMove={handleUserMove}
              typingUsers={typingUsers}
            />
          </div>
          <div className="flex flex-col w-full md:w-1/2 lg:w-2/5">
            <div className="flex-1 overflow-hidden">
              <div className="hidden md:block h-full">
                <Tabs value={activeTab} className="h-full">
                  <TabsContent value="chat" className="h-full m-0 p-0">
                    <ChatInterface
                      messages={messages}
                      typingUsers={typingUsers}
                      currentUser={username || ""}
                      inputValue={inputValue}
                      onInputChange={handleInputChange}
                      onSendMessage={handleSendMessage}
                      onSendReaction={sendReaction}
                      isAdminMode={isAdminMode}
                      onDeleteMessage={handleDelete}
                      replyingTo={replyingTo}
                      setReplyingTo={setReplyingTo}
                      hasMoreMessages={hasMoreMessages}
                      isFetchingHistory={isFetchingHistory}
                      onLoadMore={handleLoadMore}
                    />
                  </TabsContent>
                  <TabsContent value="users" className="h-full m-0 p-0">
                    <UserList users={users} typingUsers={typingUsers} />
                  </TabsContent>
                </Tabs>
              </div>
              <div className="md:hidden h-full">
                <ChatInterface
                  messages={messages}
                  typingUsers={typingUsers}
                  currentUser={username || ""}
                  inputValue={inputValue}
                  onInputChange={handleInputChange}
                  onSendMessage={handleSendMessage}
                  onSendReaction={sendReaction}
                  isAdminMode={isAdminMode}
                  onDeleteMessage={handleDelete}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  hasMoreMessages={hasMoreMessages}
                  isFetchingHistory={isFetchingHistory}
                  onLoadMore={handleLoadMore}
                />
              </div>
            </div>
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
            <Button
              variant="outline"
              size="sm"
              onClick={toggleUserPanel}
              className="flex items-center gap-2 px-3 py-2 md:hidden"
            >
              <Users className="h-4 w-4" />
            </Button>
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
