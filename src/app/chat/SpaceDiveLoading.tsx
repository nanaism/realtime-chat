import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface RadialWave {
  id: number;
  angle: number;
  speed: number;
  width: number;
  color: string;
}

interface SpeedLine {
  id: number;
  x: number;
  y: number;
  length: number;
  angle: number;
  delay: number;
}

const QuantumDiveLoading = () => {
  const [radialWaves, setRadialWaves] = useState<RadialWave[]>([]);
  const [speedLines, setSpeedLines] = useState<SpeedLine[]>([]);
  const [phase, setPhase] = useState<"dive" | "sustained">("dive");

  useEffect(() => {
    // 放射状の波
    setRadialWaves(
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        angle: i * 10,
        speed: 0.4 + Math.random() * 0.3,
        width: 3 + Math.random() * 3,
        color: i % 3 === 0 ? "#8b5cf6" : i % 3 === 1 ? "#3b82f6" : "#06b6d4",
      }))
    );

    // スピード線（ダイブ感）
    setSpeedLines(
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        length: 50 + Math.random() * 150,
        angle:
          (Math.atan2(50 - Math.random() * 100, 50 - Math.random() * 100) *
            180) /
          Math.PI,
        delay: Math.random() * 0.2,
      }))
    );

    // 0.7秒後に継続フェーズへ
    const timer = setTimeout(() => setPhase("sustained"), 700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black overflow-hidden z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.05 }}
      >
        {/* ダイナミック背景 */}
        <motion.div
          className="absolute inset-0"
          animate={{
            scale: phase === "dive" ? [1, 1.5] : 1,
          }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-gradient-radial from-purple-950/50 via-blue-950/30 to-black" />
        </motion.div>

        {/* 中央から外への爆発的な波 */}
        <motion.div
          className="absolute inset-[-50%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ scale: 0 }}
          animate={{
            scale: phase === "dive" ? [0, 2] : 1.5,
          }}
          transition={{
            duration: 0.7,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          {radialWaves.map((wave) => (
            <motion.div
              key={wave.id}
              className="absolute top-1/2 left-1/2 origin-center"
              style={{
                transform: `translate(-50%, -50%) rotate(${wave.angle}deg)`,
              }}
            >
              <motion.div
                className="origin-left"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{
                  scaleX: phase === "dive" ? [0, 1] : 0.8,
                  opacity: phase === "dive" ? [0, 1, 0.3] : 0.3,
                  x: phase === "dive" ? [0, 1000] : 800,
                }}
                transition={{
                  duration: wave.speed,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  opacity: {
                    times: [0, 0.5, 1],
                  },
                }}
                style={{
                  width: "1200px",
                  height: `${wave.width}px`,
                  background: `linear-gradient(90deg, 
                    ${wave.color} 0%, 
                    ${wave.color}aa 20%, 
                    ${wave.color}66 50%, 
                    transparent 100%
                  )`,
                  boxShadow: `0 0 ${wave.width * 3}px ${wave.color}`,
                  filter: "blur(1px)",
                }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* スピード線（外側から中心へ） */}
        {phase === "dive" &&
          speedLines.map((line) => (
            <motion.div
              key={line.id}
              className="absolute"
              style={{
                left: `${line.x}%`,
                top: `${line.y}%`,
                transform: `rotate(${line.angle}deg)`,
                transformOrigin: "center",
              }}
              initial={{ opacity: 0, x: 0 }}
              animate={{
                opacity: [0, 0.8, 0],
                x: [-line.length, 0],
              }}
              transition={{
                duration: 0.5,
                delay: line.delay,
                ease: "easeIn",
              }}
            >
              <div
                style={{
                  width: `${line.length}px`,
                  height: "1px",
                  background:
                    "linear-gradient(90deg, transparent 0%, #ffffff 50%, #3b82f6 100%)",
                  boxShadow: "0 0 5px #3b82f6",
                }}
              />
            </motion.div>
          ))}

        {/* 爆発的な中央コア */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {/* パルスコア */}
          <motion.div
            className="absolute w-40 h-40 -translate-x-1/2 -translate-y-1/2"
            animate={{
              scale: phase === "dive" ? [0, 3, 1] : [1, 1.1, 1],
            }}
            transition={{
              duration: phase === "dive" ? 0.7 : 3,
              ease: phase === "dive" ? [0.25, 0.46, 0.45, 0.94] : "easeInOut",
              repeat: phase === "sustained" ? Infinity : 0,
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `
                  radial-gradient(circle, 
                    #ffffff 0%, 
                    #8b5cf6 10%, 
                    #3b82f6 25%, 
                    #06b6d4 40%, 
                    transparent 60%
                  )
                `,
                boxShadow: `
                  0 0 60px 10px #8b5cf6,
                  0 0 100px 20px #3b82f6,
                  0 0 140px 30px #06b6d4,
                  inset 0 0 40px #ffffff
                `,
                filter: "blur(3px)",
              }}
            />
          </motion.div>

          {/* 衝撃波リング */}
          {phase === "dive" &&
            [0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 4 + i * 2],
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: 0.7,
                  delay: i * 0.1,
                  ease: "easeOut",
                }}
                style={{
                  width: "100px",
                  height: "100px",
                  borderColor:
                    i === 0 ? "#8b5cf6" : i === 1 ? "#3b82f6" : "#06b6d4",
                  boxShadow: `0 0 30px 5px ${
                    i === 0 ? "#8b5cf6" : i === 1 ? "#3b82f6" : "#06b6d4"
                  }`,
                }}
              />
            ))}
        </motion.div>

        {/* 画面全体のダイブエフェクト */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{
            opacity: phase === "dive" ? [0, 0.5, 0] : 0,
            scale: phase === "dive" ? [1.5, 1] : 1,
          }}
          transition={{
            duration: 0.7,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{
            background: `
              radial-gradient(circle at center, 
                transparent 0%, 
                rgba(139, 92, 246, 0.2) 30%, 
                rgba(59, 130, 246, 0.3) 60%, 
                rgba(6, 182, 212, 0.2) 100%
              )
            `,
          }}
        />

        {/* インパクトテキスト */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, scale: 3, z: -500 }}
          animate={{
            opacity: phase === "dive" ? [0, 0, 1] : 1,
            scale: phase === "dive" ? [3, 0.8, 1] : 1,
            z: phase === "dive" ? [-500, 0] : 0,
          }}
          transition={{
            duration: 0.7,
            times: [0, 0.4, 1],
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{ perspective: "1000px" }}
        >
          <h1
            className="text-4xl font-extrabold tracking-widest uppercase"
            style={{
              color: "#ffffff",
              textShadow: `
                0 0 20px #8b5cf6,
                0 0 40px #3b82f6,
                0 4px 8px rgba(0,0,0,0.9)
              `,
              transform: "rotateX(15deg)",
            }}
          >
            DIVE
          </h1>

          {/* 継続時のパルス */}
          {phase === "sustained" && (
            <motion.div
              className="flex justify-center space-x-3 mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-12 h-1 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${
                      ["#8b5cf6", "#3b82f6", "#06b6d4"][i]
                    }, transparent)`,
                    boxShadow: `0 0 10px ${
                      ["#8b5cf6", "#3b82f6", "#06b6d4"][i]
                    }`,
                  }}
                  animate={{
                    scaleX: [0.3, 1, 0.3],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* フラッシュトランジション */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{
            opacity: phase === "dive" ? [0, 0.8, 0] : 0,
            backgroundColor:
              phase === "dive"
                ? ["transparent", "white", "transparent"]
                : "transparent",
          }}
          transition={{
            duration: 0.7,
            times: [0, 0.3, 1],
          }}
          style={{ mixBlendMode: "screen" }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default QuantumDiveLoading;
