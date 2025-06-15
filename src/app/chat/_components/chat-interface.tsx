"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/lib/types"; // 修正: types.tsからインポート
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface ChatInterfaceProps {
  messages: Message[];
  typingUsers: string[];
  currentUser: string;
  inputValue: string;
  setInputValue: (value: string) => void;
  onSendMessage: () => void;
  onSendReaction: (messageId: string, emoji: string) => void; // ◀◀◀ 追加
}

/**
 * チャットインターフェースのメインコンポーネント
 * メッセージリスト、入力フィールド、送信ボタンなど、チャット機能の主要なUI要素を表示します。
 */
export default function ChatInterface({
  messages,
  typingUsers,
  currentUser,
  inputValue,
  setInputValue,
  onSendMessage,
  onSendReaction, // ◀◀◀ 追加
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // ▼▼▼ ここから追加 ▼▼▼
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
  // ▲▲▲ ここまで追加 ▲▲▲

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      setIsSending(true);
      onSendMessage();
      setTimeout(() => setIsSending(false), 300);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typingUsers]);

  return (
    <motion.div
      className="flex flex-col h-full relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* 背景グラデーションエフェクト */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/20 to-violet-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-violet-950/20 -z-10" />

      {/* 動的な光のエフェクト */}
      <motion.div
        className="absolute w-96 h-96 bg-gradient-to-r from-blue-400/20 to-violet-400/20 dark:from-blue-600/10 dark:to-violet-600/10 rounded-full blur-3xl"
        style={{
          x: useTransform(mouseX, [0, window.innerWidth], [-200, 200]),
          y: useTransform(mouseY, [0, window.innerHeight], [-200, 200]),
        }}
      />

      {/* チャットメッセージ表示エリア */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full absolute inset-0 p-4">
          <div className="space-y-6 pb-2">
            {" "}
            {/* space-yを調整 */}
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.23, 1, 0.32, 1],
                    delay: index * 0.05,
                  }}
                  className="chat-message relative" // ◀◀◀ 変更: relativeクラスを追加
                  onMouseEnter={() =>
                    message.type === "user" && setHoveredMessageId(message.id)
                  }
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  {message.type === "system" ? (
                    <motion.div
                      className="flex justify-center"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <span className="text-xs bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-full shadow-sm backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50">
                        <Sparkles className="inline-block w-3 h-3 mr-1" />
                        {message.content}
                      </span>
                    </motion.div>
                  ) : (
                    <div
                      className={`flex gap-3 ${
                        message.sender === currentUser
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {message.sender !== currentUser && (
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-slate-800 shadow-lg">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${message.sender}`}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-violet-400 text-white font-semibold">
                              {message.sender?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>
                      )}
                      <div /* ◀◀◀ 変更: motion.divからdivに変更し、中に移動 */
                        className={`max-w-[80%] ${
                          message.sender === currentUser ? "order-first" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          {message.sender !== currentUser && (
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {message.sender}
                            </span>
                          )}
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {formatDistanceToNow(new Date(message.timestamp), {
                              addSuffix: true,
                              locale: ja,
                            })}
                          </span>
                        </div>
                        <div className="relative">
                          {" "}
                          {/* ◀◀◀ 追加: リアクション配置のためのコンテナ */}
                          <motion.div
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 400 }}
                            className={`p-4 rounded-2xl relative overflow-hidden ${
                              message.sender === currentUser
                                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white ml-auto shadow-lg shadow-blue-500/20"
                                : "bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-lg"
                            }`}
                          >
                            {message.sender === currentUser && (
                              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 opacity-50" />
                            )}
                            <p
                              className={`relative z-10 ${
                                message.sender !== currentUser
                                  ? "text-slate-700 dark:text-slate-200"
                                  : ""
                              }`}
                            >
                              {message.content}
                            </p>
                          </motion.div>
                          {/* ▼▼▼ ここからリアクション表示エリアを丸ごと追加 ▼▼▼ */}
                          <div
                            className="absolute -bottom-5 flex gap-1 px-2"
                            style={
                              message.sender === currentUser
                                ? { right: 0 }
                                : { left: 0 }
                            }
                          >
                            <AnimatePresence>
                              {message.reactions &&
                                Object.entries(message.reactions).map(
                                  ([emoji, users]) =>
                                    users.length > 0 && (
                                      <motion.button
                                        key={emoji}
                                        layout
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{
                                          type: "spring",
                                          stiffness: 500,
                                          damping: 30,
                                        }}
                                        onClick={() =>
                                          onSendReaction(message.id, emoji)
                                        }
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs shadow-sm transition-all duration-200 ${
                                          users.includes(currentUser)
                                            ? "bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-700"
                                            : "bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50 hover:bg-slate-100 dark:hover:bg-slate-600"
                                        }`}
                                      >
                                        <span>{emoji}</span>
                                        <span
                                          className={`font-semibold ${
                                            users.includes(currentUser)
                                              ? "text-blue-600 dark:text-blue-300"
                                              : "text-slate-600 dark:text-slate-300"
                                          }`}
                                        >
                                          {users.length}
                                        </span>
                                      </motion.button>
                                    )
                                )}
                            </AnimatePresence>
                          </div>
                          {/* ▲▲▲ ここまでリアクション表示エリアを追加 ▲▲▲ */}
                          {/* ▼▼▼ ここからリアクションピッカーを丸ごと追加 ▼▼▼ */}
                          {hoveredMessageId === message.id && (
                            <motion.div
                              layoutId={`reaction-picker-${message.id}`}
                              initial={{ opacity: 0, y: 10, scale: 0.8 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.8 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className={`absolute top-[-18px] z-20 ${
                                message.sender === currentUser
                                  ? "right-2"
                                  : "left-2"
                              } bg-white/80 dark:bg-slate-700/80 backdrop-blur-md shadow-lg rounded-full p-1 flex gap-0.5 border border-slate-200 dark:border-slate-600`}
                            >
                              {EMOJI_REACTIONS.map((emoji) => (
                                <motion.button
                                  key={emoji}
                                  whileHover={{
                                    scale: 1.2,
                                    rotate: [0, -10, 10, 0],
                                  }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() =>
                                    onSendReaction(message.id, emoji)
                                  }
                                  className="text-lg p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                >
                                  {emoji}
                                </motion.button>
                              ))}
                            </motion.div>
                          )}
                          {/* ▲▲▲ ここまでリアクションピッカーを追加 ▲▲▲ */}
                        </div>
                      </div>
                      {message.sender === currentUser && (
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: -5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-slate-800 shadow-lg">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/notionists/svg?seed=${message.sender}`}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-400 text-white font-semibold">
                              {message.sender.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {/* タイピング中のユーザーがいる場合にインジケーターを表示 */}
            <AnimatePresence>
              {typingUsers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex items-center gap-3"
                >
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-slate-800 shadow-lg">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/notionists/svg?seed=${typingUsers[0]}`}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-400 text-white font-semibold">
                        {typingUsers[0].charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                  <motion.div
                    className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 p-4 rounded-2xl shadow-lg"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <div className="flex gap-1.5">
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <motion.span
                          key={i}
                          className="w-2 h-2 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-full"
                          animate={{
                            y: [0, -8, 0],
                            scale: [1, 1.2, 1],
                          }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {typingUsers.join(", ")}{" "}
                    {typingUsers.length === 1 ? "さんが" : "さん達が"}入力中...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* メッセージ入力エリア */}
      <motion.div
        className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex gap-3">
          <motion.div
            className="flex-1 relative"
            whileFocus={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 rounded-xl px-4 py-3 pr-12 shadow-sm focus:shadow-md transition-all duration-200 placeholder:text-slate-400"
            />
            {inputValue && (
              <motion.div
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                {inputValue.length}
              </motion.div>
            )}
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className={`
                relative overflow-hidden rounded-xl px-4 py-3 shadow-lg transition-all duration-300
                ${
                  !inputValue.trim()
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                    : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/25"
                }
              `}
            >
              <AnimatePresence mode="wait">
                {isSending ? (
                  <motion.div
                    key="sending"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Sparkles className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="send"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Send className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 送信ボタンのリップルエフェクト */}
              {inputValue.trim() && (
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  style={{ originX: 0.5, originY: 0.5 }}
                />
              )}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
