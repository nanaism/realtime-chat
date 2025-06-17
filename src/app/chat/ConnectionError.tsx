"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Home, RefreshCw, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface ConnectionErrorProps {
  message?: string | null;
  autoRedirectDelay?: number; // in seconds
}

/**
 * 接続失敗時に表示する超モダンなエラー画面コンポーネント
 * @param message - 表示するエラーメッセージ
 * @param autoRedirectDelay - トップページへ自動リダイレクトするまでの秒数 (デフォルト: 5秒)
 */
export default function ConnectionError({
  message = "接続に失敗しました。",
  autoRedirectDelay = 5,
}: ConnectionErrorProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(autoRedirectDelay);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // カウントダウンと自動リダイレクト
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          router.replace("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [router]);

  // パーティクル生成
  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setParticles(newParticles);
  }, []);

  const handleGoHome = () => {
    router.replace("/");
  };

  const handleRetry = () => {
    router.replace("/");
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center min-h-screen bg-black text-white overflow-hidden"
    >
      {/* アニメーション背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950/20 via-black to-red-950/20" />

      {/* グリッドパターン */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />

      {/* フローティングパーティクル */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-purple-500/30 rounded-full"
            initial={{ x: `${particle.x}%`, y: `${particle.y}%`, opacity: 0 }}
            animate={{
              y: [`${particle.y}%`, `${particle.y - 30}%`, `${particle.y}%`],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* グローエフェクト */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-3xl animate-pulse" />

      {/* メインコンテンツ */}
      <motion.div
        className="relative z-10 text-center p-10 bg-gradient-to-br from-zinc-900/40 to-zinc-900/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 w-full max-w-lg mx-4"
        initial={{ opacity: 0, scale: 0.8, rotateX: -15 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{
          boxShadow:
            "0 25px 50px -12px rgba(255, 0, 0, 0.15), 0 0 100px -50px rgba(147, 51, 234, 0.3)",
        }}
      >
        {/* アイコンアニメーション */}
        <div className="relative mb-8">
          <motion.div
            className="absolute inset-0 bg-red-500/20 rounded-full blur-2xl"
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
          <motion.div
            className="relative inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-red-500/20 to-purple-500/20 rounded-full"
            animate={{
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <WifiOff className="w-14 h-14 text-red-400" />
            </motion.div>
          </motion.div>
        </div>

        {/* タイトル */}
        <motion.h1
          className="text-5xl font-black tracking-tight bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Connection Lost
        </motion.h1>

        {/* エラーメッセージ */}
        <motion.p
          className="mt-4 text-lg text-zinc-300 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {message || "サーバーとの通信が切断されました"}
        </motion.p>

        {/* カウントダウン表示 */}
        <motion.div
          className="mt-8 mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="relative inline-flex items-center justify-center">
            {/* 円形プログレス */}
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-zinc-700"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="36"
                stroke="url(#gradient)"
                strokeWidth="3"
                fill="none"
                strokeDasharray={226}
                animate={{
                  strokeDashoffset: [0, 226],
                }}
                transition={{
                  duration: autoRedirectDelay,
                  ease: "linear",
                }}
              />
              <defs>
                <linearGradient
                  id="gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">{timeLeft}</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            自動的にトップページへ移動します
          </p>
        </motion.div>

        {/* アクションボタン */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Button
            onClick={handleGoHome}
            className="group relative bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-500 hover:to-red-500 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl overflow-hidden"
            variant="default"
            size="lg"
          >
            <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center justify-center">
              <Home className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
              トップページへ
            </span>
          </Button>

          <Button
            onClick={handleRetry}
            className="group relative bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 border border-zinc-700"
            variant="outline"
            size="lg"
          >
            <RefreshCw className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:rotate-180" />
            再試行
          </Button>
        </motion.div>

        {/* ステータスインジケーター */}
        <motion.div
          className="mt-8 flex items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-red-400 rounded-full"
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
          <span className="text-xs text-zinc-500">接続を確認中</span>
        </motion.div>
      </motion.div>

      {/* 装飾的な要素 */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
    </div>
  );
}
