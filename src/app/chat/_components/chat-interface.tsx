"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDown,
  Bell,
  ChevronDown,
  Clock,
  MessageSquare,
  MessageSquareReply,
  Send,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import TextareaAutosize from "react-textarea-autosize";

// --- Types ---
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
  systemType?:
    | "join"
    | "leave"
    | "admin"
    | "notification"
    | "activity"
    | "general";
}

interface GroupedSystemMessage {
  id: string;
  type: "grouped-system";
  messages: Message[];
  timestamp: string;
}

type ProcessedMessage = Message | GroupedSystemMessage;

interface ChatInterfaceProps {
  messages: Message[];
  typingUsers: string[];
  currentUser: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onSendReaction: (messageId: string, emoji: string) => void;
  onDeleteMessage: (messageId: string) => void;
  replyingTo: Message | null;
  setReplyingTo: (message: Message | null) => void;
  isAdminMode: boolean;
}

// --- Helper Functions & Components ---

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

// システムメッセージタイプごとの設定
const SYSTEM_MESSAGE_CONFIG = {
  join: {
    icon: UserPlus,
    color: "from-green-400 to-emerald-500",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
  },
  leave: {
    icon: UserMinus,
    color: "from-orange-400 to-red-500",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  admin: {
    icon: Shield,
    color: "from-purple-400 to-indigo-500",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
  notification: {
    icon: Bell,
    color: "from-blue-400 to-cyan-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  activity: {
    icon: Activity,
    color: "from-pink-400 to-rose-500",
    bgColor: "bg-pink-50 dark:bg-pink-900/20",
    borderColor: "border-pink-200 dark:border-pink-800",
  },
  general: {
    icon: MessageSquare,
    color: "from-slate-400 to-slate-500",
    bgColor: "bg-slate-50 dark:bg-slate-900/20",
    borderColor: "border-slate-200 dark:border-slate-800",
  },
};

const DeleteConfirmation = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) => (
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

// システムメッセージ単体コンポーネント
const SystemMessageItem = memo(function SystemMessageItem({
  message,
  isAdminMode,
  onDeleteClick,
  showTimestamp = false,
}: {
  message: Message;
  isAdminMode: boolean;
  onDeleteClick: (id: string) => void;
  showTimestamp?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const config = SYSTEM_MESSAGE_CONFIG[message.systemType || "general"];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex justify-center items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative group">
        <motion.div
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full
            ${config.bgColor} ${config.borderColor}
            border backdrop-blur-sm
            transition-all duration-300
            ${isHovered ? "shadow-md" : ""}
          `}
          whileHover={{ scale: 1.02 }}
        >
          <motion.div
            className={`w-4 h-4 rounded-full bg-gradient-to-r ${config.color} flex items-center justify-center`}
            animate={isHovered ? { rotate: 360 } : {}}
            transition={{ duration: 0.5 }}
          >
            <Icon className="w-2.5 h-2.5 text-white" />
          </motion.div>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            {message.content}
          </span>
          {showTimestamp && (
            <>
              <div className="w-px h-3 bg-slate-300 dark:bg-slate-600" />
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {formatDistanceToNow(new Date(message.timestamp))}
              </span>
            </>
          )}
        </motion.div>

        <AnimatePresence>
          {isAdminMode && isHovered && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, x: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%" }}
              exit={{ opacity: 0, scale: 0.5, x: "-50%" }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDeleteClick(message.id)}
              className="absolute -bottom-8 left-1/2 p-1.5 rounded-lg bg-red-500/90 text-white shadow-lg backdrop-blur-sm"
              title="メッセージを削除"
            >
              <Trash2 className="w-3 h-3" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

// グルーピングされたシステムメッセージコンポーネント
const CollapsibleSystemMessages = memo(function CollapsibleSystemMessages({
  group,
  isAdminMode,
  onDeleteClick,
}: {
  group: GroupedSystemMessage;
  isAdminMode: boolean;
  onDeleteClick: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const messageTypes = useMemo(() => {
    const types = new Map<string, number>();
    group.messages.forEach((msg) => {
      const type = msg.systemType || "general";
      types.set(type, (types.get(type) || 0) + 1);
    });
    return Array.from(types.entries());
  }, [group.messages]);

  const timeRange = useMemo(() => {
    if (group.messages.length === 0) return null;
    const first = new Date(group.messages[0].timestamp);
    const last = new Date(group.messages[group.messages.length - 1].timestamp);
    return {
      start: formatDistanceToNow(first),
      end: formatDistanceToNow(last),
    };
  }, [group.messages]);

  return (
    <div className="flex flex-col items-center py-2">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative group"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <motion.div
          className={`
            flex items-center gap-3 px-4 py-2 rounded-full
            bg-white/60 dark:bg-slate-800/60 backdrop-blur-md
            border ${
              isOpen
                ? "border-slate-300 dark:border-slate-600"
                : "border-slate-200 dark:border-slate-700"
            }
            shadow-sm hover:shadow-md transition-all duration-300
          `}
        >
          <div className="flex -space-x-2">
            {messageTypes.slice(0, 3).map(([type], index) => {
              const config =
                SYSTEM_MESSAGE_CONFIG[
                  type as keyof typeof SYSTEM_MESSAGE_CONFIG
                ];
              const Icon = config.icon;
              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    w-6 h-6 rounded-full bg-gradient-to-r ${config.color}
                    flex items-center justify-center
                    ring-2 ring-white dark:ring-slate-800
                  `}
                >
                  <Icon className="w-3 h-3 text-white" />
                </motion.div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {group.messages.length}件のシステムイベント
            </span>
            {timeRange && !isOpen && (
              <>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600" />
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {timeRange.end}
                </span>
              </>
            )}
          </div>

          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full max-w-2xl mt-3 overflow-hidden"
          >
            <motion.div
              className="p-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 space-y-2"
              initial={{ y: -10 }}
              animate={{ y: 0 }}
            >
              <div className="flex flex-wrap gap-2 mb-3">
                {messageTypes.map(([type, count]) => {
                  const config =
                    SYSTEM_MESSAGE_CONFIG[
                      type as keyof typeof SYSTEM_MESSAGE_CONFIG
                    ];
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={type}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`
                        flex items-center gap-1.5 px-2.5 py-1 rounded-full
                        ${config.bgColor} ${config.borderColor} border
                      `}
                    >
                      <Icon className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {count}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              <div className="space-y-1.5">
                {group.messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <SystemMessageItem
                      message={msg}
                      isAdminMode={isAdminMode}
                      onDeleteClick={onDeleteClick}
                      showTimestamp={true}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ユーザーメッセージコンポーネント
const UserMessageItem = memo(function UserMessageItem({
  message,
  currentUser,
  isAdminMode,
  onDeleteClick,
  onReplyClick,
  onReaction,
  onReplyJump,
}: {
  message: Message;
  currentUser: string;
  isAdminMode: boolean;
  onDeleteClick: (id: string) => void;
  onReplyClick: (message: Message) => void;
  onReaction: (
    messageId: string,
    emoji: string,
    event: React.MouseEvent
  ) => void;
  onReplyJump: (messageId: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
  const EMOJI_COLORS: Record<string, string> = {
    "👍": "from-blue-400 to-blue-600",
    "❤️": "from-red-400 to-pink-600",
    "😂": "from-yellow-400 to-orange-500",
    "😮": "from-purple-400 to-violet-600",
    "😢": "from-cyan-400 to-blue-500",
    "🙏": "from-amber-400 to-yellow-500",
  };

  const handleReactionClick = (
    messageId: string,
    emoji: string,
    event: React.MouseEvent
  ) => {
    setSelectedEmoji(emoji);
    onReaction(messageId, emoji, event);
    setTimeout(() => setSelectedEmoji(null), 500);
  };

  return (
    <motion.div
      id={`message-${message.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="chat-message relative rounded-2xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex gap-3 ${
          message.sender === currentUser ? "justify-end" : "justify-start"
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
                  message.sender !== currentUser
                    ? "text-slate-700 dark:text-slate-200"
                    : ""
                }`}
              >
                {message.replyContext && message.replyTo && (
                  <motion.a
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={(e) => {
                      e.preventDefault();
                      onReplyJump(message.replyTo!);
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
                        {message.replyContext.sender} さんへの返信
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
                      animate={{ rotate: 360 }}
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
                message.sender === currentUser ? { right: 0 } : { left: 0 }
              }
            >
              <AnimatePresence>
                {message.reactions &&
                  Object.entries(message.reactions).map(
                    ([emoji, users]) =>
                      users.length > 0 && (
                        <motion.button
                          key={emoji}
                          initial={{ scale: 0, opacity: 0, y: -10 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ scale: 0, opacity: 0, y: -10 }}
                          whileHover={{ scale: 1.15, y: -3 }}
                          whileTap={{ scale: 0.85 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 20,
                          }}
                          onClick={(e) =>
                            handleReactionClick(message.id, emoji, e)
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
                                    rotate: [0, -10, 10, -10, 10, 0],
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
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`absolute top-[-35px] z-20 ${
                    message.sender === currentUser ? "right-2" : "left-2"
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
                      onClick={() => onReplyClick(message)}
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
                            message.reactions?.[emoji]?.includes(currentUser);
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
                              whileTap={!hasReacted ? { scale: 0.8 } : {}}
                              onClick={(e) => onReaction(message.id, emoji, e)}
                              disabled={!!hasReacted}
                              className={`relative w-10 h-10 rounded-xl flex items-center justify-center group transition-all duration-300 ${
                                hasReacted
                                  ? "opacity-50 grayscale"
                                  : "hover:bg-gradient-to-br hover:from-slate-100/50 hover:to-slate-200/50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50"
                              }`}
                            >
                              <span className="text-xl group-hover:drop-shadow-lg transition-all">
                                {emoji}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                    {(message.sender === currentUser || isAdminMode) && (
                      <motion.button
                        whileHover={{
                          scale: 1.1,
                          rotate: [0, -5, 5, 0],
                        }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onDeleteClick(message.id)}
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
    </motion.div>
  );
});

// メインチャットインターフェース
export default function ChatInterface({
  messages,
  typingUsers,
  currentUser,
  inputValue,
  onInputChange,
  onSendMessage,
  onSendReaction,
  onDeleteMessage,
  replyingTo,
  setReplyingTo,
  isAdminMode,
}: ChatInterfaceProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // メッセージ処理ロジック
  const processedMessages = useMemo(() => {
    const newMessages: ProcessedMessage[] = [];
    let systemMessageGroup: Message[] = [];
    const GROUPING_THRESHOLD = 3; // 3件以上でグループ化

    const flushSystemGroup = () => {
      if (systemMessageGroup.length === 0) return;
      if (systemMessageGroup.length >= GROUPING_THRESHOLD) {
        newMessages.push({
          id: `group-${systemMessageGroup[0].id}`,
          type: "grouped-system",
          messages: systemMessageGroup,
          timestamp:
            systemMessageGroup[systemMessageGroup.length - 1].timestamp,
        });
      } else {
        newMessages.push(...systemMessageGroup);
      }
      systemMessageGroup = [];
    };

    messages.forEach((message) => {
      if (message.type === "system") {
        systemMessageGroup.push(message);
      } else {
        flushSystemGroup();
        newMessages.push(message);
      }
    });
    flushSystemGroup();

    return newMessages;
  }, [messages]);

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: processedMessages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: useCallback(
      (index: number) => {
        const item = processedMessages[index];
        if (!item) return 120;
        switch (item.type) {
          case "user":
            return item.replyTo ? 180 : 120;
          case "system":
            return 50;
          case "grouped-system":
            return 60;
          default:
            return 120;
        }
      },
      [processedMessages]
    ),
    overscan: 10,
  });
  const virtualItems = virtualizer.getVirtualItems();

  // スクロール制御
  const scrollToBottom = useCallback(
    (behavior: "smooth" | "auto" = "smooth") => {
      if (virtualizer && processedMessages.length > 0) {
        virtualizer.scrollToIndex(processedMessages.length - 1, {
          align: "end",
          behavior,
        });
      }
    },
    [virtualizer, processedMessages.length]
  );

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } =
      scrollContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 150;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setNewMessagesCount(0);
    }
  }, []);

  // Effects
  const prevMessagesLength = useRef(messages.length);
  useLayoutEffect(() => {
    const isNewMessageAdded = messages.length > prevMessagesLength.current;

    if (prevMessagesLength.current === 0 && messages.length > 0) {
      scrollToBottom("auto");
    } else if (isNewMessageAdded) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === currentUser || isAtBottom) {
        scrollToBottom("smooth");
      } else {
        const newMessagesCount = messages.length - prevMessagesLength.current;
        setNewMessagesCount((prev) => prev + newMessagesCount);
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, currentUser, isAtBottom, scrollToBottom]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 500);
  }, []);

  // ハンドラー
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  const handleGoToBottomClick = () => {
    scrollToBottom("smooth");
  };

  const handleReplyJump = (messageId: string) => {
    const targetIndex = processedMessages.findIndex(
      (m) => m.type === "user" && m.id === messageId
    );
    if (targetIndex !== -1 && virtualizer) {
      virtualizer.scrollToIndex(targetIndex, {
        align: "center",
        behavior: "smooth",
      });
      const el = document.getElementById(`message-${messageId}`);
      if (el) {
        el.classList.add("highlight-message");
        setTimeout(() => {
          el.classList.remove("highlight-message");
        }, 2000);
      }
    }
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteMessage(deleteConfirmId);
      setDeleteConfirmId(null);
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
        .whitespace-pre-wrap {
          white-space: pre-wrap;
        }
      `}</style>

      <div className="flex flex-col h-full relative overflow-hidden">
        <AnimatePresence>
          {deleteConfirmId && (
            <DeleteConfirmation
              onConfirm={confirmDelete}
              onCancel={() => setDeleteConfirmId(null)}
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/20 to-violet-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-violet-950/20 -z-10" />

        <div className="flex-1 overflow-hidden relative">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto"
          >
            <div
              className="w-full relative"
              style={{ height: `${virtualizer.getTotalSize()}px` }}
            >
              {virtualItems.map((virtualItem) => {
                const item = processedMessages[virtualItem.index];
                if (!item) return null;

                const content = () => {
                  switch (item.type) {
                    case "user":
                      return (
                        <UserMessageItem
                          message={item}
                          currentUser={currentUser}
                          isAdminMode={isAdminMode}
                          onDeleteClick={setDeleteConfirmId}
                          onReplyClick={setReplyingTo}
                          onReaction={onSendReaction}
                          onReplyJump={handleReplyJump}
                        />
                      );
                    case "system":
                      return (
                        <SystemMessageItem
                          message={item}
                          isAdminMode={isAdminMode}
                          onDeleteClick={onDeleteMessage}
                        />
                      );
                    case "grouped-system":
                      return (
                        <CollapsibleSystemMessages
                          group={item}
                          isAdminMode={isAdminMode}
                          onDeleteClick={onDeleteMessage}
                        />
                      );
                    default:
                      return null;
                  }
                };

                return (
                  <div
                    key={item.id}
                    ref={virtualizer.measureElement}
                    data-index={virtualItem.index}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                      padding: "0.25rem 1rem",
                    }}
                  >
                    {content()}
                  </div>
                );
              })}
            </div>
            <AnimatePresence>
              {typingUsers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 p-4"
                >
                  <Avatar>
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${typingUsers[0]}`}
                    />
                  </Avatar>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {typingUsers.join(", ")} が入力中...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {!isAtBottom && (
              <motion.div
                initial={{ y: "150%", opacity: 0, scale: 0.7 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: "150%", opacity: 0, scale: 0.7 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                  mass: 0.8,
                }}
                className="absolute bottom-4 right-4 z-20"
              >
                <motion.button
                  onClick={handleGoToBottomClick}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative flex items-center justify-center gap-2 h-12 pl-4 pr-5 rounded-full
                             bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg
                             border border-slate-200/80 dark:border-slate-700/80
                             shadow-2xl shadow-slate-500/10 dark:shadow-black/20
                             text-slate-700 dark:text-slate-200"
                  aria-label="一番下に戻る"
                >
                  <ArrowDown className="h-5 w-5" />
                  <span className="text-sm font-semibold">一番下に戻る</span>
                  <AnimatePresence>
                    {newMessagesCount > 0 && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                          scale: 1,
                          opacity: 1,
                          transition: {
                            type: "spring",
                            stiffness: 500,
                            damping: 25,
                            delay: 0.2,
                          },
                        }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-red-500 to-pink-500 text-xs font-bold text-white shadow-lg dark:border-slate-800"
                      >
                        {newMessagesCount > 9 ? "9+" : newMessagesCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
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
              <div className="bg-gradient-to-r from-blue-50 to-violet-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 flex items-center justify-between gap-3 border border-blue-200/50 dark:border-blue-700/50 shadow-lg">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-b from-white/70 to-white/90 dark:from-slate-900/70 dark:to-slate-900/90 backdrop-blur-xl">
          <div className="flex gap-3 items-end relative z-10">
            <TextareaAutosize
              ref={inputRef}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder={
                isAdminMode ? "管理者モード..." : "メッセージを入力..."
              }
              minRows={1}
              maxRows={8}
              className="relative z-10 bg-white/95 dark:bg-slate-800/95 border-0 rounded-xl px-5 py-4 text-base font-medium shadow-none focus:outline-none focus:ring-0 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none w-full"
            />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={`relative overflow-hidden rounded-xl px-5 py-4 h-auto shadow-2xl transition-all duration-300 ${
                  !inputValue.trim()
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                    : "bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white shadow-blue-500/25"
                }`}
              >
                <AnimatePresence mode="wait">
                  {isSending ? (
                    <motion.div key="sending" exit={{ scale: 0 }}>
                      <Zap className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <motion.div key="send" exit={{ scale: 0 }}>
                      <Send className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </div>
          <motion.div
            animate={{
              opacity: isInputFocused ? 1 : 0,
              y: isInputFocused ? 0 : 5,
            }}
            className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3 font-sans"
          >
            <kbd className="px-1.5 py-1 text-xs font-semibold bg-white border rounded-md">
              Shift
            </kbd>{" "}
            +{" "}
            <kbd className="px-1.5 py-1 text-xs font-semibold bg-white border rounded-md">
              Enter
            </kbd>{" "}
            で改行
          </motion.div>
        </div>
      </div>
    </>
  );
}
