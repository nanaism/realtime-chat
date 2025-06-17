"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AnimatePresence,
  motion,
  useAnimation,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  ArrowDown,
  MessageSquareReply,
  Send,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import type React from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
// ▼▼▼ 変更: react-textarea-autosize をインポート ▼▼▼
import TextareaAutosize from "react-textarea-autosize";

// Message型の定義
interface Message {
  id: string;
  type: "user" | "system";
  sender: string;
  content: string;
  timestamp: string;
  reactions?: Record<string, string[]>;
  replyTo?: string;
  replyContext?: {
    sender: string;
    content: string;
  };
}

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

// 入力パーティクルエフェクト
const InputParticle = ({ x, y }: { x: number; y: number }) => {
  const controls = useAnimation();

  useEffect(() => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 50;
    const duration = 0.8 + Math.random() * 0.4;

    controls.start({
      x: [0, Math.cos(angle) * distance],
      y: [0, Math.sin(angle) * distance - 20],
      opacity: [0, 1, 0],
      scale: [0, 1.5, 0],
      transition: {
        duration,
        ease: "easeOut",
        times: [0, 0.2, 1],
      },
    });
  }, [controls]);

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x - 2, top: y - 2 }}
      animate={controls}
    >
      <div className="w-1 h-1 bg-gradient-to-r from-blue-400 to-violet-400 rounded-full shadow-lg shadow-blue-400/50" />
    </motion.div>
  );
};

// 波紋エフェクト
const RippleEffect = ({ x, y }: { x: number; y: number }) => {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, top: y }}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 4, opacity: 0 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      <div className="w-20 h-20 -ml-10 -mt-10 rounded-full border-2 border-blue-400/50" />
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

interface ChatInterfaceProps {
  messages: Message[];
  typingUsers: string[];
  currentUser: string;
  inputValue: string;
  setInputValue: (value: string) => void;
  onSendMessage: () => void;
  onSendReaction: (messageId: string, emoji: string) => void;
  onDeleteMessage: (messageId: string) => void;
  replyingTo: Message | null;
  setReplyingTo: (message: Message | null) => void;
}

export default function ChatInterface({
  messages,
  typingUsers,
  currentUser,
  inputValue,
  setInputValue,
  onSendMessage,
  onSendReaction,
  onDeleteMessage,
  replyingTo,
  setReplyingTo,
}: ChatInterfaceProps) {
  // 1. StateとRefの準備
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const isAtBottomRef = useRef(true);
  // ▼▼▼ 変更: inputRef の型を HTMLTextAreaElement に変更 ▼▼▼
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const [isSending, setIsSending] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [particles, setParticles] = useState<
    Array<{ id: string; x: number; y: number; emoji: string }>
  >([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  // 新しい入力欄関連のstate
  const [inputParticles, setInputParticles] = useState<
    Array<{ id: string; x: number; y: number }>
  >([]);
  const [ripples, setRipples] = useState<
    Array<{ id: string; x: number; y: number }>
  >([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showInitialRipple, setShowInitialRipple] = useState(true);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const inputMouseX = useMotionValue(0);
  const inputMouseY = useMotionValue(0);

  // プレースホルダーアニメーション
  const placeholderTexts = ["メッセージを入力..."];

  useEffect(() => {
    if (!isInputFocused && !inputValue) {
      const interval = setInterval(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholderTexts.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isInputFocused, inputValue, placeholderTexts.length]);

  // 初期フォーカスと波紋エフェクト
  useEffect(() => {
    // 初期フォーカス
    setTimeout(() => {
      inputRef.current?.focus();
    }, 500);

    // 初期波紋エフェクト
    if (showInitialRipple && inputContainerRef.current) {
      const rect = inputContainerRef.current.getBoundingClientRect();
      const id = `initial-ripple-${Date.now()}`;
      setRipples([{ id, x: rect.width / 2, y: rect.height / 2 }]);
      setShowInitialRipple(false);

      setTimeout(() => {
        setRipples([]);
      }, 1000);
    }
  }, [showInitialRipple]);

  // ▼▼▼ 変更: イベントの型を HTMLTextAreaElement に変更 ▼▼▼
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // 文字が追加された時にパーティクルを生成
    if (newValue.length > inputValue.length && inputContainerRef.current) {
      const rect = inputContainerRef.current.getBoundingClientRect();
      const particleCount = 3 + Math.floor(Math.random() * 3);

      for (let i = 0; i < particleCount; i++) {
        const id = `input-particle-${Date.now()}-${i}`;
        const x = rect.width * 0.8 + Math.random() * 40;
        const y = rect.height / 2 + (Math.random() - 0.5) * 20;

        setInputParticles((prev) => [...prev, { id, x, y }]);

        setTimeout(() => {
          setInputParticles((prev) => prev.filter((p) => p.id !== id));
        }, 1000);
      }
    }
  };

  // 入力欄のマウストラッキング
  const handleInputMouseMove = (e: React.MouseEvent) => {
    if (inputContainerRef.current) {
      const rect = inputContainerRef.current.getBoundingClientRect();
      inputMouseX.set(e.clientX - rect.left);
      inputMouseY.set(e.clientY - rect.top);
    }
  };

  // フォーカス時の波紋エフェクト
  const handleInputFocus = () => {
    setIsInputFocused(true);
    if (inputContainerRef.current) {
      const rect = inputContainerRef.current.getBoundingClientRect();
      const id = `focus-ripple-${Date.now()}`;
      setRipples((prev) => [
        ...prev,
        { id, x: rect.width / 2, y: rect.height / 2 },
      ]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 1000);
    }
  };

  const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
  const EMOJI_COLORS: Record<string, string> = {
    "👍": "from-blue-400 to-blue-600",
    "❤️": "from-red-400 to-pink-600",
    "😂": "from-yellow-400 to-orange-500",
    "😮": "from-purple-400 to-violet-600",
    "😢": "from-cyan-400 to-blue-500",
    "🙏": "from-amber-400 to-yellow-500",
  };

  // 2. スクロール制御関数の作成
  const getScrollViewport = () => {
    return scrollAreaRef.current?.querySelector<HTMLDivElement>(
      ":scope > div[data-radix-scroll-area-viewport]"
    );
  };

  const scrollToBottom = useCallback(
    (behavior: "smooth" | "auto" = "smooth") => {
      const viewport = getScrollViewport();
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior });
      }
    },
    []
  );

  const handleScroll = useCallback(() => {
    const viewport = getScrollViewport();
    if (!viewport) return;

    const threshold = 50;
    const isNowAtBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
      threshold;

    isAtBottomRef.current = isNowAtBottom;

    if (isNowAtBottom && newMessagesCount > 0) {
      setNewMessagesCount(0);
    }
  }, [newMessagesCount]);

  // 3. `useEffect` の刷新
  const prevMessagesLengthRef = useRef(messages.length);
  useLayoutEffect(() => {
    const isNewMessageAdded = messages.length > prevMessagesLengthRef.current;

    if (isNewMessageAdded) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === currentUser || isAtBottomRef.current) {
        scrollToBottom("smooth");
      } else {
        setNewMessagesCount((prev) => prev + 1);
      }
    }

    if (prevMessagesLengthRef.current === 0 && messages.length > 0) {
      scrollToBottom("auto");
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages, currentUser, scrollToBottom]);

  // スクロールイベントリスナーを登録
  useEffect(() => {
    const viewport = getScrollViewport();
    if (viewport) {
      viewport.addEventListener("scroll", handleScroll, { passive: true });
      return () => viewport.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // ▼▼▼ 変更: キーイベントの型を HTMLTextAreaElement に変更 ▼▼▼
  // ロジック: Shift+EnterでないEnterキー押下時のみ送信。それ以外はデフォルトの挙動（改行など）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      setIsSending(true);
      scrollToBottom("smooth");
      onSendMessage();
      setTimeout(() => setIsSending(false), 300);
    }
  };

  const handleGoToBottomClick = () => {
    scrollToBottom("smooth");
    setNewMessagesCount(0);
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

  const handleReplyClick = (message: Message) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const handleReplyJump = (messageId: string) => {
    const targetElement = document.getElementById(`message-${messageId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      targetElement.classList.add("highlight-message");
      setTimeout(() => {
        targetElement.classList.remove("highlight-message");
      }, 2000);
    }
  };

  return (
    <>
      <style jsx global>{`
        @keyframes highlight-pulse {
          0% {
            background-color: transparent;
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
          50% {
            background-color: rgba(59, 130, 246, 0.1);
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
          }
          100% {
            background-color: transparent;
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }
        .highlight-message {
          animation: highlight-pulse 2s ease-out;
          border-radius: 1rem;
        }

        @keyframes breathe {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        .breathing-border {
          animation: breathe 3s ease-in-out infinite;
        }

        .shimmer-effect {
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
        }

        /* ▼▼▼ 削除: テキストエリアでは不要なため ▼▼▼ */
        /*
        @keyframes cursor-blink {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }

        .animated-cursor::after {
          content: "|";
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          animation: cursor-blink 1s infinite;
          color: #3b82f6;
          font-weight: bold;
        }
        */

        /* ▼▼▼ 追加: 改行を正しく表示するためのスタイル ▼▼▼ */
        .whitespace-pre-wrap {
          white-space: pre-wrap;
        }
      `}</style>

      <motion.div
        className="flex flex-col h-full relative overflow-hidden"
        onMouseMove={handleMouseMove}
      >
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
        <AnimatePresence>
          {deleteConfirmId && (
            <DeleteConfirmation
              onConfirm={confirmDelete}
              onCancel={() => setDeleteConfirmId(null)}
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/20 to-violet-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-violet-950/20 -z-10" />
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-blue-400/20 to-violet-400/20 dark:from-blue-600/10 dark:to-violet-600/10 rounded-full blur-3xl"
          style={{
            x: useTransform(mouseX, [0, window.innerWidth], [-200, 200]),
            y: useTransform(mouseY, [0, window.innerHeight], [-200, 200]),
          }}
        />

        <div className="flex-1 overflow-hidden relative">
          <ScrollArea
            ref={scrollAreaRef}
            className="h-full absolute inset-0 p-4"
          >
            <div className="space-y-6 pb-2">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    id={`message-${message.id}`}
                    key={message.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    transition={{
                      duration: 0.4,
                      ease: [0.23, 1, 0.32, 1],
                    }}
                    className="chat-message relative rounded-2xl"
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
                              <div
                                className={`relative z-10 break-words whitespace-pre-wrap ${
                                  // ◀◀◀ `whitespace-pre-wrap` を追加して改行を反映
                                  message.sender !== currentUser
                                    ? "text-slate-700 dark:text-slate-200"
                                    : ""
                                }`}
                              >
                                {/* 改善されたリプライ引用表示 */}
                                {message.replyContext && message.replyTo && (
                                  <motion.a
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleReplyJump(message.replyTo!);
                                    }}
                                    href={`#message-${message.replyTo}`}
                                    className={`
                                      block mb-3 p-3 rounded-xl cursor-pointer
                                      transition-all duration-300 relative overflow-hidden
                                      ${
                                        message.sender === currentUser
                                          ? "bg-white/15 hover:bg-white/20 border border-white/20"
                                          : "bg-gradient-to-r from-blue-50/80 to-violet-50/80 dark:from-blue-900/20 dark:to-violet-900/20 hover:from-blue-100/80 hover:to-violet-100/80 dark:hover:from-blue-900/30 dark:hover:to-violet-900/30 border border-blue-200/50 dark:border-blue-700/50"
                                      }
                                    `}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
                                    <div className="flex items-center gap-2 mb-1">
                                      <MessageSquareReply
                                        className={`w-3 h-3 ${
                                          message.sender === currentUser
                                            ? "text-white/70"
                                            : "text-blue-600 dark:text-blue-400"
                                        }`}
                                      />
                                      <span
                                        className={`text-xs font-bold ${
                                          message.sender === currentUser
                                            ? "text-white/90"
                                            : "bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400 bg-clip-text text-transparent"
                                        }`}
                                      >
                                        {message.replyContext.sender}{" "}
                                        さんへの返信
                                      </span>
                                    </div>
                                    <p
                                      className={`text-sm line-clamp-2 ${
                                        message.sender === currentUser
                                          ? "text-white/80"
                                          : "text-slate-600 dark:text-slate-300"
                                      }`}
                                    >
                                      {message.replyContext.content}
                                    </p>
                                    <motion.div
                                      className="absolute top-0 right-0 w-20 h-20 opacity-10"
                                      animate={{
                                        rotate: 360,
                                      }}
                                      transition={{
                                        duration: 20,
                                        repeat: Infinity,
                                        ease: "linear",
                                      }}
                                    >
                                      <MessageSquareReply className="w-full h-full" />
                                    </motion.div>
                                  </motion.a>
                                )}

                                {message.content}
                              </div>
                            </motion.div>

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
                                          animate={{
                                            scale: 1,
                                            opacity: 1,
                                            y: 0,
                                          }}
                                          exit={{
                                            scale: 0,
                                            opacity: 0,
                                            y: -10,
                                          }}
                                          whileHover={{ scale: 1.15, y: -3 }}
                                          whileTap={{ scale: 0.85 }}
                                          transition={{
                                            type: "spring",
                                            stiffness: 500,
                                            damping: 20,
                                          }}
                                          onClick={(e) =>
                                            handleReaction(message.id, emoji, e)
                                          }
                                          className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm shadow-xl transition-all duration-300 ${
                                            users.includes(currentUser)
                                              ? `bg-gradient-to-r ${
                                                  EMOJI_COLORS[emoji] ||
                                                  "from-blue-400 to-blue-600"
                                                } text-white border-transparent shadow-lg`
                                              : "bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-slate-200/50 dark:border-slate-600/50 hover:border-blue-400/50 hover:shadow-2xl"
                                          }`}
                                        >
                                          <motion.div
                                            className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/0 via-purple-400/0 to-pink-400/0 group-hover:from-blue-400/20 group-hover:via-purple-400/20 group-hover:to-pink-400/20"
                                            initial={{ opacity: 0 }}
                                            whileHover={
                                              !users.includes(currentUser)
                                                ? { opacity: 1 }
                                                : { opacity: 0 }
                                            }
                                          />
                                          <motion.span
                                            className="text-base relative z-10"
                                            animate={
                                              selectedEmoji === emoji
                                                ? {
                                                    rotate: [
                                                      0, -10, 10, -10, 10, 0,
                                                    ],
                                                    scale: [1, 1.3, 1],
                                                  }
                                                : {}
                                            }
                                            transition={{ duration: 0.5 }}
                                          >
                                            {emoji}
                                          </motion.span>
                                          <span
                                            className={`font-bold text-xs relative z-10 ${
                                              users.includes(currentUser)
                                                ? "text-white"
                                                : "text-slate-600 dark:text-slate-300"
                                            }`}
                                          >
                                            {users.length}
                                          </span>
                                          <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            whileHover={{ opacity: 1, y: 0 }}
                                            className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900/95 text-white text-xs rounded-lg backdrop-blur-xl whitespace-nowrap pointer-events-none shadow-xl"
                                          >
                                            {users.join(", ")}
                                          </motion.div>
                                        </motion.button>
                                      )
                                  )}
                              </AnimatePresence>
                            </div>

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
                                    <motion.button
                                      whileHover={{
                                        scale: 1.1,
                                        y: -2,
                                        transition: { duration: 0.2 },
                                      }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => handleReplyClick(message)}
                                      className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500/90 to-violet-500/90 backdrop-blur-2xl shadow-2xl border border-white/20 hover:from-blue-600/90 hover:to-violet-600/90 group transition-all"
                                      title="リプライ"
                                    >
                                      <MessageSquareReply className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                                    </motion.button>

                                    <motion.div
                                      className="relative"
                                      initial={{ rotateX: -20 }}
                                      animate={{ rotateX: 0 }}
                                      transition={{ duration: 0.3 }}
                                      style={{ transformStyle: "preserve-3d" }}
                                    >
                                      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl shadow-2xl rounded-2xl p-2 flex gap-1 border border-slate-200/50 dark:border-slate-600/50">
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl" />
                                        {EMOJI_REACTIONS.map((emoji, index) => {
                                          const hasReacted =
                                            message.reactions?.[
                                              emoji
                                            ]?.includes(currentUser);
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
                                                !hasReacted
                                                  ? { scale: 0.8 }
                                                  : {}
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
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {typingUsers.join(", ")}{" "}
                      {typingUsers.length === 1 ? "さんが" : "さん達が"}
                      入力中...
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>

          <AnimatePresence>
            {newMessagesCount > 0 && (
              <motion.div
                initial={{ y: "200%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "200%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
              >
                <Button
                  onClick={handleGoToBottomClick}
                  className="rounded-full shadow-xl bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white border-0 pl-4 pr-5 py-2 h-auto group"
                >
                  <motion.div
                    animate={{ y: [0, -2, 0, 2, 0] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="group-hover:animate-bounce"
                  >
                    <ArrowDown className="h-5 w-5 mr-2" />
                  </motion.div>
                  <span className="font-bold">{newMessagesCount}</span>
                  件の新着メッセージ
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="p-4 pt-0 border-t border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-b from-white/70 to-white/90 dark:from-slate-900/70 dark:to-slate-900/90 backdrop-blur-xl"
            >
              <motion.div
                className="bg-gradient-to-r from-blue-50 to-violet-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 flex items-center justify-between gap-3 border border-blue-200/50 dark:border-blue-700/50 shadow-lg"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                    <MessageSquareReply className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      返信先:{" "}
                      <span className="font-bold bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400 bg-clip-text text-transparent">
                        {replyingTo.sender}
                      </span>
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-200 truncate font-medium">
                      {replyingTo.content}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setReplyingTo(null)}
                  className="w-8 h-8 rounded-lg bg-slate-200/50 dark:bg-slate-600/50 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors group"
                  aria-label="リプライをキャンセル"
                >
                  <X className="h-4 w-4 text-slate-500 dark:text-slate-400 group-hover:text-red-500 transition-colors" />
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-b from-white/70 to-white/90 dark:from-slate-900/70 dark:to-slate-900/90 backdrop-blur-xl relative overflow-visible"
          initial={replyingTo ? { y: 0 } : { y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <motion.div
            className="absolute -inset-[4px] rounded-2xl border breathing-border pointer-events-none"
            style={{
              background: "linear-gradient(90deg, #fff0f0 0%, #f3f4f6 10%, )",
              borderColor: "#e5e7eb",
              opacity: 0.8,
            }}
          />

          {/* 入力欄の背景グロー効果 */}
          <motion.div
            className="absolute inset-0 -m-4"
            animate={{
              background: [
                "radial-gradient(ellipse at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%)",
                "radial-gradient(ellipse at center, rgba(147, 51, 234, 0.1) 0%, transparent 70%)",
                "radial-gradient(ellipse at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%)",
              ],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <div className="flex gap-3 items-end relative z-10">
            <motion.div
              ref={inputContainerRef}
              className="flex-1 relative"
              onMouseMove={handleInputMouseMove}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {/* 波紋エフェクト */}
              <AnimatePresence>
                {ripples.map((ripple) => (
                  <RippleEffect key={ripple.id} x={ripple.x} y={ripple.y} />
                ))}
              </AnimatePresence>

              {/* 入力パーティクル: 文字カーソル位置に表示 */}
              <AnimatePresence>
                {inputParticles.map((particle) => {
                  // カーソル位置取得
                  let caretX = particle.x;
                  let caretY = particle.y;
                  if (inputRef.current) {
                    const input = inputRef.current;
                    const value = input.value;
                    const selectionStart = input.selectionStart ?? value.length;
                    // テキスト幅計算用のダミーspanを作成
                    const span = document.createElement("span");
                    span.style.visibility = "hidden";
                    span.style.position = "absolute";
                    span.style.whiteSpace = "pre";
                    span.style.font = window.getComputedStyle(input).font;
                    span.textContent = value.slice(0, selectionStart);
                    document.body.appendChild(span);
                    const rect = input.getBoundingClientRect();
                    const spanRect = span.getBoundingClientRect();
                    // inputのpadding-leftを考慮
                    const style = window.getComputedStyle(input);
                    const paddingLeft = parseFloat(style.paddingLeft || "0");
                    caretX = spanRect.width + paddingLeft;
                    caretY = rect.height / 2;
                    document.body.removeChild(span);
                  }
                  return (
                    <InputParticle key={particle.id} x={caretX} y={caretY} />
                  );
                })}
              </AnimatePresence>

              <div className="relative bg-white/95 dark:bg-slate-800/95 rounded-xl overflow-hidden">
                {/* シマーエフェクト */}
                <div
                  className="absolute inset-0 shimmer-effect opacity-30"
                  style={{
                    background:
                      "linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.7) 50%, transparent 60%)",
                  }}
                />

                {/* ▼▼▼ 変更: Input を TextareaAutosize に置き換え ▼▼▼ */}
                <TextareaAutosize
                  ref={inputRef}
                  id="chat-input"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={handleInputFocus}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder={placeholderTexts[placeholderIndex]}
                  minRows={1}
                  maxRows={8}
                  className={`
                    relative z-10 bg-transparent border-0 rounded-xl px-5 py-4 pr-16 
                    text-base font-medium shadow-none
                    focus:outline-none focus:ring-0
                    placeholder:text-slate-400 dark:placeholder:text-slate-500
                    transition-all duration-300
                    resize-none w-full
                  `}
                  style={{
                    textShadow: isInputFocused
                      ? "0 0 20px rgba(59, 130, 246, 0.3)"
                      : "none",
                  }}
                />

                {/* 文字数カウンター */}
                <AnimatePresence>
                  {inputValue && (
                    <motion.div
                      className="absolute right-4 bottom-3 text-xs font-bold"
                      initial={{ opacity: 0, scale: 0.8, rotate: -180 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.8, rotate: 180 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400 bg-clip-text text-transparent">
                        {inputValue.length}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* 送信ボタン */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400 }}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              style={{ originX: 0.5, originY: 0.5 }}
            >
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={`
                  relative overflow-hidden rounded-xl px-5 py-4 h-auto shadow-2xl transition-all duration-300
                  ${
                    !inputValue.trim()
                      ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                      : "bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white shadow-blue-500/25"
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
                      <Zap className="h-5 w-5" />
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

                {/* 送信ボタンの波動エフェクト */}
                {inputValue.trim() && (
                  <>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0"
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      animate={{
                        boxShadow: [
                          "0 0 20px rgba(59, 130, 246, 0.5)",
                          "0 0 40px rgba(147, 51, 234, 0.5)",
                          "0 0 20px rgba(59, 130, 246, 0.5)",
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </>
                )}
              </Button>
            </motion.div>
          </div>
          {/* ▼▼▼ 追加: 改行方法のガイド ▼▼▼ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: isInputFocused ? 1 : 0,
              y: isInputFocused ? 0 : 10,
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3 font-sans"
          >
            <kbd className="px-1.5 py-1 text-xs font-semibold text-slate-700 bg-white/80 border border-slate-200/80 rounded-md dark:bg-slate-900/80 dark:text-slate-200 dark:border-slate-700/80 shadow-sm backdrop-blur-sm">
              Shift
            </kbd>
            <span className="mx-1 font-sans">+</span>
            <kbd className="px-1.5 py-1 text-xs font-semibold text-slate-700 bg-white/80 border border-slate-200/80 rounded-md dark:bg-slate-900/80 dark:text-slate-200 dark:border-slate-700/80 shadow-sm backdrop-blur-sm">
              Enter
            </kbd>
            <span className="ml-1.5">で改行</span>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}
