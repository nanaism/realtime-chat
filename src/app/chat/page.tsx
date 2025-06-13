"use client";

import ChatInterface from "@/app/chat/_components/chat-interface";
import UserList from "@/app/chat/_components/user-list";
import VirtualSpace from "@/app/chat/_components/virtual-space";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { LogOut, MessageSquare, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useChatSocket } from "./_hooks/use-chat-socket";

// パーティクルのプロパティを定義する型 (追加)
type Particle = {
  id: number;
  left: string;
  top: string;
  x: number;
  duration: number;
  delay: number;
};

// モダンなローディングコンポーネント
const ModernLoading = () => {
  // 螺旋を描くドットのデータ
  const dots = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (360 / 12) * i,
    delay: i * 0.1,
  }));

  // 流体的なブロブのパス
  const blobPaths = [
    "M60,-60C80,-40,100,-20,100,0C100,20,80,40,60,60C40,80,20,100,0,100C-20,100,-40,80,-60,60C-80,40,-100,20,-100,0C-100,-20,-80,-40,-60,-60C-40,-80,-20,-100,0,-100C20,-100,40,-80,60,-60Z",
    "M70,-70C85,-50,100,-25,100,0C100,25,85,50,70,70C50,85,25,100,0,100C-25,100,-50,85,-70,70C-85,50,-100,25,-100,0C-100,-25,-85,-50,-70,-70C-50,-85,-25,-100,0,-100C25,-100,50,-85,70,-70Z",
    "M50,-80C70,-65,90,-40,95,-10C100,20,90,50,70,70C50,90,20,100,-10,95C-40,90,-65,70,-80,50C-95,30,-100,0,-95,-30C-90,-60,-70,-85,-45,-95C-20,-105,10,-105,35,-95C60,-85,30,-95,50,-80Z",
  ];

  // ★ 修正点: パーティクルのランダム値をstateで管理
  const [particles, setParticles] = useState<Particle[]>([]);

  // ★ 修正点: クライアントサイドでのみ実行されるuseEffectでランダム値を生成
  useEffect(() => {
    const generatedParticles = Array.from(
      { length: 20 },
      (_, i): Particle => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        x: Math.random() * 40 - 20,
        duration: 3 + Math.random() * 2,
        delay: Math.random() * 3,
      })
    );
    setParticles(generatedParticles);
  }, []); // 空の依存配列でマウント時に一度だけ実行

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center overflow-hidden z-50">
      {/* 背景のグラデーションメッシュ */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-200/30 to-transparent rounded-full filter blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-blue-200/30 to-transparent rounded-full filter blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* メインコンテナ */}
      <div className="relative">
        {/* 外側の回転リング */}
        <motion.div
          className="absolute inset-0 w-48 h-48 -left-24 -top-24"
          animate={{ rotate: 360 }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {dots.map((dot) => (
            <motion.div
              key={dot.id}
              className="absolute w-full h-full"
              style={{
                rotate: `${dot.angle}deg`,
              }}
            >
              <motion.div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0],
                  y: [0, -20, -40],
                }}
                transition={{
                  duration: 3,
                  delay: dot.delay,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              >
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 rounded-full shadow-lg shadow-purple-500/50" />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* 中心の流体シェイプ */}
        <div className="relative w-48 h-48">
          <svg viewBox="-120 -120 240 240" className="w-full h-full">
            <defs>
              <linearGradient
                id="gradient1"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <motion.stop
                  offset="0%"
                  stopColor="#8B5CF6"
                  animate={{
                    stopColor: ["#8B5CF6", "#3B82F6", "#8B5CF6"],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.stop
                  offset="100%"
                  stopColor="#3B82F6"
                  animate={{
                    stopColor: ["#3B82F6", "#8B5CF6", "#3B82F6"],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* モーフィングブロブ */}
            <motion.path
              d={blobPaths[0]}
              fill="url(#gradient1)"
              filter="url(#glow)"
              animate={{
                d: blobPaths,
                rotate: [0, 360],
              }}
              transition={{
                d: {
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                rotate: {
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                },
              }}
            />

            {/* 内側の軌道リング */}
            <motion.circle
              cx="0"
              cy="0"
              r="60"
              fill="none"
              stroke="url(#gradient1)"
              strokeWidth="0.5"
              strokeDasharray="5 10"
              opacity="0.3"
              animate={{
                rotate: -360,
                strokeDashoffset: [0, -15],
              }}
              transition={{
                rotate: {
                  duration: 30,
                  repeat: Infinity,
                  ease: "linear",
                },
                strokeDashoffset: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                },
              }}
            />
          </svg>

          {/* 中心のコア */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8"
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="w-full h-full bg-white rounded-full shadow-2xl shadow-purple-500/50" />
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full"
              animate={{
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          {/* 周回する小さな球体 */}
          {[0, 120, 240].map((angle, index) => (
            <motion.div
              key={angle}
              className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2"
              animate={{
                rotate: [angle, angle + 360],
              }}
              transition={{
                duration: 3 + index,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <motion.div
                className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4"
                animate={{
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 2,
                  delay: index * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className="w-full h-full bg-gradient-to-br from-white to-purple-400 rounded-full shadow-lg shadow-purple-500/50" />
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* 放射状のパルス */}
        <motion.div
          className="absolute inset-0 -inset-8"
          initial={{ opacity: 0 }}
          animate={{
            scale: [1, 2, 2.5],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeOut",
          }}
        >
          <div className="w-full h-full border border-purple-300 rounded-full" />
        </motion.div>
      </div>

      {/* 微細なパーティクル */}
      {/* ★ 修正点: stateの値を使ってパーティクルを描画 */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute w-1 h-1 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full"
            style={{
              left: p.left,
              top: p.top,
            }}
            animate={{
              y: [-20, 20],
              x: [0, p.x],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default function ChatPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (!storedUsername) {
      router.push("/");
    } else {
      setUsername(storedUsername);
    }
  }, [router]);

  const {
    users,
    messages,
    typingUsers,
    isSocketInitialized,
    sendMessage,
    sendTypingUpdate,
    sendUserMove,
    logout,
  } = useChatSocket({ username });

  const currentUserId = useMemo(() => {
    return users.find((user) => user.name === username)?.id || null;
  }, [users, username]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || !username) return;
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

  if (!username || !isSocketInitialized) {
    return <ModernLoading />;
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="py-4 px-8 flex items-center justify-between border-b bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🪐</span>
            <h1 className="text-3xl font-bold tracking-tight font-sans bg-gradient-to-r from-indigo-300 to-purple-700 bg-clip-text text-transparent">
            <Link href="/" className="hover:opacity-80 transition-opacity">Oga Space</Link>
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
    </div>
  );
}
