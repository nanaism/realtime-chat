"use client";

import ChatInterface from "@/app/chat/_components/chat-interface";
import UserList from "@/app/chat/_components/user-list";
import VirtualSpace from "@/app/chat/_components/virtual-space";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, MessageSquare, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChatSocket } from "./_hooks/use-chat-socket";

// 宇宙ダイブローディングコンポーネント
const SpaceDiveLoading = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState<"initial" | "diving" | "entering">(
    "initial"
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // --- ▼▼▼ ここから修正 ▼▼▼ ---

  // 型定義 (任意ですが、コードが読みやすくなります)
  interface Star {
    id: number;
    x: number;
    y: number;
    z: number;
    size: number;
    brightness: number;
  }
  interface NebulaCloud {
    id: number;
    x: number;
    y: number;
    scale: number;
    opacity: number;
    color: "purple" | "blue" | "pink";
  }
  interface LightStreak {
    id: number;
    angle: number;
    distance: number;
    length: number;
    delay: number;
  }

  // Stateの初期値を空の配列にする
  const [stars, setStars] = useState<Star[]>([]);
  const [nebulaClouds, setNebulaClouds] = useState<NebulaCloud[]>([]);
  const [lightStreaks, setLightStreaks] = useState<LightStreak[]>([]);

  // useEffectを使って、クライアントサイドでのみランダム値を生成する
  useEffect(() => {
    // スターフィールドの生成
    setStars(
      Array.from({ length: 200 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        z: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.8 + 0.2,
      }))
    );

    // ネビュラ雲の生成
    setNebulaClouds(
      Array.from({ length: 5 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        scale: Math.random() * 2 + 1,
        opacity: Math.random() * 0.3 + 0.1,
        color: (["purple", "blue", "pink"] as const)[
          Math.floor(Math.random() * 3)
        ],
      }))
    );

    // 光の筋（ワープ効果）
    setLightStreaks(
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        angle: Math.random() * 360,
        distance: Math.random() * 50 + 50,
        length: Math.random() * 100 + 50,
        delay: Math.random() * 0.5,
      }))
    );
  }, []); // 空の依存配列で、初回マウント時に一度だけ実行

  // --- ▲▲▲ ここまで修正 ▲▲▲ ---

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase("diving"), 500);
    const timer2 = setTimeout(() => setPhase("entering"), 2000);
    const timer3 = setTimeout(() => onComplete(), 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        className="fixed inset-0 bg-black overflow-hidden z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* 深宇宙背景グラデーション */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-indigo-950/20 via-black to-black"
            animate={{
              scale: phase === "entering" ? 20 : 1,
              opacity: phase === "entering" ? 0 : 1,
            }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </div>

        {/* ネビュラ雲 */}
        {nebulaClouds.map((cloud) => (
          <motion.div
            key={cloud.id}
            className={`absolute rounded-full filter blur-3xl mix-blend-screen`}
            style={{
              left: `${cloud.x}%`,
              top: `${cloud.y}%`,
              width: `${cloud.scale * 300}px`,
              height: `${cloud.scale * 300}px`,
              background: `radial-gradient(circle, ${
                cloud.color === "purple"
                  ? "rgba(147, 51, 234, 0.3)"
                  : cloud.color === "blue"
                  ? "rgba(59, 130, 246, 0.3)"
                  : "rgba(236, 72, 153, 0.3)"
              } 0%, transparent 70%)`,
            }}
            animate={{
              x: phase === "diving" ? "-200%" : 0,
              scale: phase === "entering" ? 5 : 1,
              opacity: phase === "entering" ? 0 : cloud.opacity,
            }}
            transition={{
              duration: phase === "diving" ? 2 : 1,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* スターフィールド */}
        <div className="absolute inset-0">
          {stars.map((star) => (
            <motion.div
              key={star.id}
              className="absolute rounded-full bg-white"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: star.brightness,
                boxShadow: `0 0 ${star.size * 2}px rgba(255,255,255,${
                  star.brightness
                })`,
              }}
              animate={{
                x: phase === "diving" ? `${-star.z * 10}vw` : 0,
                y: phase === "diving" ? `${(50 - star.y) * 0.2}vh` : 0,
                scale: phase === "entering" ? 0 : 1,
                opacity: phase === "entering" ? 0 : star.brightness,
              }}
              transition={{
                duration: phase === "diving" ? 2 - star.z / 100 : 0.5,
                ease: phase === "diving" ? "easeIn" : "easeOut",
              }}
            />
          ))}
        </div>

        {/* ワープストリーク効果 */}
        {phase === "diving" && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {lightStreaks.map((streak) => (
              <motion.div
                key={streak.id}
                className="absolute w-1 bg-gradient-to-t from-transparent via-white to-transparent"
                style={{
                  height: `${streak.length}px`,
                  transform: `rotate(${streak.angle}deg) translateY(-${streak.distance}vh)`,
                  transformOrigin: "center bottom",
                }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{
                  scaleY: [0, 1, 0],
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: 0.8,
                  delay: streak.delay,
                  ease: "easeOut",
                  repeat: phase === "diving" ? Infinity : 0,
                  repeatDelay: 0.2,
                }}
              />
            ))}
          </motion.div>
        )}

        {/* ブラックホール */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{
            scale: phase === "initial" ? 0 : phase === "diving" ? 1 : 30,
            opacity: phase === "initial" ? 0 : 1,
          }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        >
          {/* イベントホライズン */}
          <motion.div
            className="relative w-48 h-48"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {/* 降着円盤 */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, #f97316, #eab308, #84cc16, #06b6d4, #6366f1, #c026d3, #f97316)",
                filter: "blur(8px)",
              }}
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* ブラックホール本体 */}
            <div className="absolute inset-8 rounded-full bg-black shadow-[0_0_100px_20px_rgba(0,0,0,0.8)]" />

            {/* 重力レンズ効果 */}
            <motion.div
              className="absolute -inset-4 rounded-full border-2 border-white/20"
              style={{
                boxShadow: "inset 0 0 50px rgba(255,255,255,0.1)",
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        </motion.div>

        {/* ダイブテキスト */}
        <motion.div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: phase === "initial" ? 1 : 0,
            y: phase === "initial" ? 0 : -20,
          }}
          transition={{ duration: 0.5 }}
        >
          <motion.h2
            className="text-4xl font-bold text-white mb-4"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            Diving into Space
          </motion.h2>
          <motion.div className="flex justify-center space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-white rounded-full"
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.div>
        </motion.div>

        {/* ハイパースペースエフェクト（最終段階） */}
        {phase === "entering" && (
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.5, times: [0, 0.5, 1] }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default function ChatPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [showSpaceDive, setShowSpaceDive] = useState(true);
  const [minimumLoadTimePassed, setMinimumLoadTimePassed] = useState(false);

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (!storedUsername) {
      router.push("/");
    } else {
      setUsername(storedUsername);
    }

    // 最低1秒のローディング時間を保証
    const timer = setTimeout(() => {
      setMinimumLoadTimePassed(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  const {
    users,
    messages,
    typingUsers,
    isSocketInitialized,
    sendMessage,
    sendTypingUpdate,
    sendUserMove,
    sendReaction, // ◀◀◀ 追加
    deleteMessage,
    clearChatHistory,
    logout,
  } = useChatSocket({ username });

  const currentUserId = useMemo(() => {
    return users.find((user) => user.name === username)?.id || null;
  }, [users, username]);

  // ▼▼▼ 裏コマンドを定義 ▼▼▼
  const PURGE_COMMAND = "/!purge_chat_history_absolutely_!/";

  const handleSendMessage = () => {
    if (!inputValue.trim() || !username) return;

    // ▼▼▼ 裏コマンドの処理を追加 ▼▼▼
    if (inputValue === PURGE_COMMAND) {
      if (
        window.confirm(
          "本当にすべてのチャット履歴を削除しますか？\nこの操作は元に戻せません。"
        )
      ) {
        clearChatHistory();
        setInputValue(""); // 入力欄をクリア
      }
      return; // 通常のメッセージ送信は行わない
    }
    // ▲▲▲ ここまで追加 ▲▲▲

    sendMessage(inputValue);
    setInputValue("");
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    const isTyping = value.trim().length > 0;
    sendTypingUpdate(isTyping);
  };

  const handleUserMove = (
    _userId: string,
    newPosition: { x: number; y: number }
  ) => {
    sendUserMove(newPosition);
  };

  const handleLeave = () => {
    logout();
    localStorage.removeItem("username");
    setUsername(null);
    setInputValue("");
    setShowUserPanel(false);
    setActiveTab("chat");
    router.push("/");
  };

  const toggleUserPanel = () => {
    setShowUserPanel((prev) => !prev);
  };

  const switchTab = (tab: string) => {
    setActiveTab(tab);
  };

  const handleSpaceDiveComplete = () => {
    setShowSpaceDive(false);
  };

  const shouldShowLoading =
    !username ||
    !isSocketInitialized ||
    !minimumLoadTimePassed ||
    showSpaceDive;

  if (shouldShowLoading) {
    // SpaceDiveLoadingコンポーネントは元のコードをそのまま使ってください
    return <SpaceDiveLoading onComplete={handleSpaceDiveComplete} />;
  }

  return (
    <motion.div
      className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950"
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
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          {users.length} 人参加中
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
                    currentUser={username}
                    inputValue={inputValue}
                    setInputValue={handleInputChange}
                    onSendMessage={handleSendMessage}
                    onSendReaction={sendReaction}
                    onDeleteMessage={deleteMessage} // ◀◀◀ 追加
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
                currentUser={username}
                inputValue={inputValue}
                setInputValue={handleInputChange}
                onSendMessage={handleSendMessage}
                onSendReaction={sendReaction}
                 onDeleteMessage={deleteMessage} // ◀◀◀ 追加
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
              <span className="hidden sm:inline">チャット</span>
            </Button>
            <Button
              variant={activeTab === "users" ? "default" : "outline"}
              size="sm"
              onClick={() => switchTab("users")}
              className="flex items-center gap-2 px-3 py-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">
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
  );
}
