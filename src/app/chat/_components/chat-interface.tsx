"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/lib/types";
import {
  AnimatePresence,
  motion,
  useAnimation,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { Send, Sparkles, Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
// 時間差を日本語で表示するヘルパー関数
const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}日前`;
  if (hours > 0) return `${hours}時間前`;
  if (minutes > 0) return `${minutes}分前`;
  return "たった今";
};

interface ChatInterfaceProps {
  messages: Message[];
  typingUsers: string[];
  currentUser: string;
  inputValue: string;
  setInputValue: (value: string) => void;
  onSendMessage: () => void;
  onSendReaction: (messageId: string, emoji: string) => void;
  onDeleteMessage: (messageId: string) => void;
}

// パーティクルコンポーネント
const ParticleEffect = ({
  x,
  y,
  emoji,
}: {
  x: number;
  y: number;
  emoji: string;
}) => {
  const controls = useAnimation();

  useEffect(() => {
    controls.start({
      y: [0, -100],
      opacity: [1, 0],
      scale: [0, 1.5, 0],
      // [修正点] アニメーション速度を倍速に (1s -> 0.5s)
      transition: { duration: 0.5, ease: "easeOut" },
    });
  }, [controls]);

  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      style={{ left: x, top: y }}
      animate={controls}
    >
      <span className="text-2xl">{emoji}</span>
    </motion.div>
  );
};

// 削除確認モーダル
const DeleteConfirmation = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
      className="absolute inset-0 flex items-center justify-center z-50"
    >
      <motion.div
        className="bg-black/20 backdrop-blur-md absolute inset-0"
        onClick={onCancel}
      />
      <motion.div
        className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20 relative z-10 w-80 max-w-[90vw]"
        layoutId="delete-modal"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 500 }}
          className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center"
        >
          <Trash2 className="w-8 h-8 text-white" />
        </motion.div>
        <h3 className="text-lg font-bold font-sans text-center mb-2 bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent whitespace-nowrap">
          メッセージを削除しますか？
        </h3>
        <p className="text-sm font-sans text-slate-600 dark:text-slate-400 text-center mb-6">
          この操作は取り消せません
        </p>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl font-sans bg-slate-200/50 dark:bg-slate-700/50 backdrop-blur-sm hover:bg-slate-300/50 dark:hover:bg-slate-600/50 transition-colors"
          >
            キャンセル
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-xl font-sans bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/25 whitespace-nowrap"
          >
            削除
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function ChatInterface({
  messages,
  typingUsers,
  currentUser,
  inputValue,
  setInputValue,
  onSendMessage,
  onSendReaction,
  onDeleteMessage,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [particles, setParticles] = useState<
    Array<{ id: string; x: number; y: number; emoji: string }>
  >([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
  // [修正点] TypeScriptエラーを解消するため、Record<string, string> 型を指定
  const EMOJI_COLORS: Record<string, string> = {
    "👍": "from-blue-400 to-blue-600",
    "❤️": "from-red-400 to-pink-600",
    "😂": "from-yellow-400 to-orange-500",
    "😮": "from-purple-400 to-violet-600",
    "😢": "from-cyan-400 to-blue-500",
    "🙏": "from-amber-400 to-yellow-500",
  };

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

  const handleReaction = (
    messageId: string,
    emoji: string,
    event: React.MouseEvent
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const id = `particle-${Date.now()}`;
    setParticles((prev) => [...prev, { id, x: rect.left, y: rect.top, emoji }]);
    onSendReaction(messageId, emoji);
    setSelectedEmoji(emoji);
    setTimeout(() => setSelectedEmoji(null), 500);
    // [修正点] アニメーション速度に合わせてパーティクルの消去時間を調整 (1000ms -> 500ms)
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }, 500);
  };

  const handleDeleteClick = (messageId: string) => {
    setDeleteConfirmId(messageId);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteMessage(deleteConfirmId);
      setDeleteConfirmId(null);
    }
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
      {/* パーティクルレイヤー */}
      <AnimatePresence>
        {particles.map((particle) => (
          <ParticleEffect
            key={particle.id}
            x={particle.x}
            y={particle.y}
            emoji={particle.emoji}
          />
        ))}
      </AnimatePresence>

      {/* 削除確認モーダル */}
      <AnimatePresence>
        {deleteConfirmId && (
          <DeleteConfirmation
            onConfirm={confirmDelete}
            onCancel={() => setDeleteConfirmId(null)}
          />
        )}
      </AnimatePresence>

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
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                  transition={{
                    duration: 0.4,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                  className="chat-message relative"
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
                      <div
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
                            {formatDistanceToNow(new Date(message.timestamp))}
                          </span>
                        </div>
                        <div className="relative">
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

                          {/* リアクションバッジ */}
                          <div
                            className="absolute -bottom-6 flex gap-1.5 px-2"
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
                                        initial={{
                                          scale: 0,
                                          opacity: 0,
                                          y: -10,
                                        }}
                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                        exit={{ scale: 0, opacity: 0, y: -10 }}
                                        whileHover={{ scale: 1.1, y: -2 }}
                                        whileTap={{ scale: 0.9 }}
                                        transition={{
                                          type: "spring",
                                          stiffness: 500,
                                          damping: 20,
                                        }}
                                        onClick={(e) =>
                                          handleReaction(message.id, emoji, e)
                                        }
                                        className={`group relative flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm shadow-md transition-all duration-300 ${
                                          users.includes(currentUser)
                                            ? `bg-gradient-to-r ${
                                                EMOJI_COLORS[emoji] ||
                                                "from-blue-400 to-blue-600"
                                              } text-white border-transparent`
                                            : "bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-slate-200/50 dark:border-slate-600/50 hover:border-blue-400/50"
                                        }`}
                                      >
                                        <motion.span
                                          className="text-base"
                                          animate={
                                            selectedEmoji === emoji
                                              ? {
                                                  rotate: [
                                                    0, -10, 10, -10, 10, 0,
                                                  ],
                                                  scale: [1, 1.2, 1],
                                                }
                                              : {}
                                          }
                                          transition={{ duration: 0.5 }}
                                        >
                                          {emoji}
                                        </motion.span>
                                        <span
                                          className={`font-semibold text-xs ${
                                            users.includes(currentUser)
                                              ? "text-white"
                                              : "text-slate-600 dark:text-slate-300"
                                          }`}
                                        >
                                          {users.length}
                                        </span>

                                        {/* ホバー時のツールチップ */}
                                        <motion.div
                                          initial={{ opacity: 0, y: 5 }}
                                          whileHover={{ opacity: 1, y: 0 }}
                                          className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900/90 text-white text-xs rounded-lg backdrop-blur-sm whitespace-nowrap pointer-events-none"
                                        >
                                          {users.join(", ")}
                                        </motion.div>
                                      </motion.button>
                                    )
                                )}
                            </AnimatePresence>
                          </div>

                          {/* ホバー時のアクションパネル */}
                          <AnimatePresence>
                            {hoveredMessageId === message.id && (
                              <motion.div
                                initial={{
                                  opacity: 0,
                                  y: 10,
                                  scale: 0.8,
                                  filter: "blur(4px)",
                                }}
                                animate={{
                                  opacity: 1,
                                  y: 0,
                                  scale: 1,
                                  filter: "blur(0px)",
                                }}
                                exit={{
                                  opacity: 0,
                                  y: 10,
                                  scale: 0.8,
                                  filter: "blur(4px)",
                                }}
                                transition={{
                                  duration: 0.2,
                                  ease: "easeOut",
                                }}
                                className={`absolute top-[-35px] z-20 ${
                                  message.sender === currentUser
                                    ? "right-2"
                                    : "left-2"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {/* 3Dリアクションピッカー */}
                                  <motion.div
                                    className="relative"
                                    initial={{ rotateX: -20 }}
                                    animate={{ rotateX: 0 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ transformStyle: "preserve-3d" }}
                                  >
                                    <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl shadow-2xl rounded-2xl p-2 flex gap-1 border border-slate-200/50 dark:border-slate-600/50">
                                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl" />
                                      {/* [修正点] 既リアクションのスタイルと無効化 */}
                                      {EMOJI_REACTIONS.map((emoji, index) => {
                                        const hasReacted =
                                          message.reactions?.[emoji]?.includes(
                                            currentUser
                                          );
                                        return (
                                          <motion.button
                                            key={emoji}
                                            initial={{
                                              opacity: 0,
                                              scale: 0,
                                            }}
                                            animate={{
                                              opacity: 1,
                                              scale: 1,
                                              transition: {
                                                delay: index * 0.03,
                                              },
                                            }}
                                            whileHover={
                                              !hasReacted
                                                ? {
                                                    scale: 1.3,
                                                    rotate: [0, -15, 15, 0],
                                                    y: -5,
                                                    transition: {
                                                      duration: 0.3,
                                                    },
                                                  }
                                                : {}
                                            }
                                            whileTap={
                                              !hasReacted ? { scale: 0.8 } : {}
                                            }
                                            onClick={(e) =>
                                              handleReaction(
                                                message.id,
                                                emoji,
                                                e
                                              )
                                            }
                                            disabled={hasReacted}
                                            className={`relative w-10 h-10 rounded-xl flex items-center justify-center group transition-all duration-300 ${
                                              hasReacted
                                                ? "opacity-50 grayscale"
                                                : "hover:bg-gradient-to-br hover:from-slate-100/50 hover:to-slate-200/50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50"
                                            }`}
                                          >
                                            <span className="text-xl group-hover:drop-shadow-lg transition-all">
                                              {emoji}
                                            </span>
                                            <motion.div
                                              className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/0 via-purple-400/0 to-pink-400/0 group-hover:from-blue-400/20 group-hover:via-purple-400/20 group-hover:to-pink-400/20"
                                              initial={{ opacity: 0 }}
                                              whileHover={
                                                !hasReacted
                                                  ? { opacity: 1 }
                                                  : { opacity: 0 }
                                              }
                                            />
                                          </motion.button>
                                        );
                                      })}
                                    </div>
                                  </motion.div>

                                  {/* 削除ボタン (自分のメッセージの場合のみ) */}
                                  {message.sender === currentUser && (
                                    <motion.button
                                      initial={{
                                        opacity: 0,
                                        scale: 0,
                                        rotate: -180,
                                      }}
                                      animate={{
                                        opacity: 1,
                                        scale: 1,
                                        rotate: 0,
                                      }}
                                      exit={{
                                        opacity: 0,
                                        scale: 0,
                                        rotate: 180,
                                      }}
                                      whileHover={{
                                        scale: 1.1,
                                        rotate: [0, -5, 5, 0],
                                      }}
                                      whileTap={{ scale: 0.9 }}
                                      transition={{
                                        duration: 0.3,
                                        ease: "easeOut",
                                      }}
                                      onClick={() =>
                                        handleDeleteClick(message.id)
                                      }
                                      className="relative p-2.5 rounded-xl bg-gradient-to-br from-red-500/90 to-pink-500/90 text-white backdrop-blur-xl shadow-xl border border-red-400/20 group overflow-hidden"
                                      title="メッセージを削除"
                                    >
                                      <motion.div
                                        className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0"
                                        initial={{ x: "-100%" }}
                                        whileHover={{ x: "100%" }}
                                        transition={{ duration: 0.5 }}
                                      />
                                      <Trash2 className="w-4 h-4 relative z-10" />
                                      <motion.div
                                        className="absolute inset-0 bg-red-600/20 blur-xl"
                                        animate={{
                                          scale: [1, 1.2, 1],
                                          opacity: [0.5, 0.8, 0.5],
                                        }}
                                        transition={{
                                          duration: 2,
                                          repeat: Infinity,
                                          ease: "easeInOut",
                                        }}
                                      />
                                    </motion.button>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
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

            {/* タイピング中のユーザー表示 */}
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
