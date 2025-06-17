import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// ▼▼▼ 各要素の型定義を追加（可読性向上のため） ▼▼▼
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

// 宇宙ダイブローディングコンポーネント
const SpaceDiveLoading = () => {
  const [phase, setPhase] = useState<"initial" | "diving" | "entering">(
    "initial"
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // ▼▼▼ ここからが修正箇所 ▼▼▼
  // Stateの初期値を空配列にし、クライアントサイドで生成
  const [stars, setStars] = useState<Star[]>([]);
  const [nebulaClouds, setNebulaClouds] = useState<NebulaCloud[]>([]);
  const [lightStreaks, setLightStreaks] = useState<LightStreak[]>([]);

  useEffect(() => {
    // このuseEffectはクライアントサイドでのみ実行される
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
    // 光の筋の生成
    setLightStreaks(
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        angle: Math.random() * 360,
        distance: Math.random() * 50 + 50,
        length: Math.random() * 100 + 50,
        delay: Math.random() * 0.5,
      }))
    );
  }, []); // 空の依存配列で初回マウント時に一度だけ実行
  // ▲▲▲ ここまでが修正箇所 ▲▲▲

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase("diving"), 500);
    const timer2 = setTimeout(() => setPhase("entering"), 2000);
    // const timer3 = setTimeout(() => onComplete(), 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      // clearTimeout(timer3);
    };
  }, []);

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

export default SpaceDiveLoading;
