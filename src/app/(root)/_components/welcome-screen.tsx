"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import gsap from "gsap";
import Lottie from "lottie-react";
import { MessageSquare, Sparkles, Users, Zap } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type React from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

// Advanced Lottie Animation - Floating Orbs (変更なし)
const floatingOrbAnimation = {
  v: "5.5.7",
  fr: 60,
  ip: 0,
  op: 180,
  w: 200,
  h: 200,
  nm: "Floating Orb",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Orb",
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [30], e: [80] },
            { t: 90, s: [80], e: [30] },
            { t: 180, s: [30] },
          ],
        },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: 0, s: [100, 100, 0], e: [100, 80, 0] },
            { t: 90, s: [100, 80, 0], e: [100, 120, 0] },
            { t: 180, s: [100, 120, 0] },
          ],
        },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 100, 100], e: [120, 120, 100] },
            { t: 90, s: [120, 120, 100], e: [100, 100, 100] },
            { t: 180, s: [100, 100, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: "gr",
          it: [
            { ty: "el", s: { a: 0, k: [60, 60] }, p: { a: 0, k: [0, 0] } },
            {
              ty: "gf",
              o: { a: 0, k: 100 },
              r: 2,
              g: {
                p: 3,
                k: {
                  a: 0,
                  k: [0, 0.2, 0.6, 1, 0.5, 0.1, 0.4, 0.8, 1, 0, 0.2, 0.6],
                },
              },
              s: { a: 0, k: [0, 0] },
              e: { a: 0, k: [30, 0] },
              t: 1,
            },
            { ty: "fl", c: { a: 0, k: [0.2, 0.4, 1, 1] }, o: { a: 0, k: 20 } },
          ],
        },
      ],
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: "Glow",
      sr: 1,
      ks: {
        o: { a: 0, k: 60 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100, 0] },
        s: { a: 0, k: [150, 150, 100] },
      },
      ef: [
        {
          ty: 29,
          nm: "Gaussian Blur",
          np: 5,
          en: 1,
          ef: [{ ty: 0, nm: "Blurriness", v: { a: 0, k: 30 } }],
        },
      ],
      shapes: [
        {
          ty: "gr",
          it: [
            { ty: "el", s: { a: 0, k: [80, 80] }, p: { a: 0, k: [0, 0] } },
            { ty: "fl", c: { a: 0, k: [0.4, 0.6, 1, 0.6] } },
          ],
        },
      ],
    },
  ],
};

// 必要な型をframer-motionからインポート
import { Variants } from "framer-motion";

// ... 他のimport文

// =================================================================
// === ✨ 修正されたロゴアニメーションコンポーネント ✨ ===
// =================================================================
const LogoAnimation = memo(() => {
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 磁気的な追従のためのMotion ValueとSpring
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 15, stiffness: 200, mass: 0.1 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  // 3D回転エフェクト
  const rotateX = useTransform(springY, [-0.5, 0.5], [25, -25]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-25, 25]);
  const scale = useTransform<[number, number], number>(
    [springX, springY],
    ([x, y]) =>
      1 +
      Math.sqrt(
        Math.pow(x as unknown as number, 2) +
          Math.pow(y as unknown as number, 2)
      ) *
        0.1
  );

  // マウスイベントのハンドラ
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    },
    [mouseX, mouseY]
  );

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  // 【修正点2】'any'を排除するため、variantsを使用
  const prismaticVariants: Variants = {
    initial: {
      opacity: 0,
      "--angle": "0deg",
      transition: {
        opacity: { duration: 0.5, ease: "easeInOut" },
        "--angle": { duration: 0.5, ease: "easeInOut" },
      },
    },
    hover: {
      opacity: 0.4,
      "--angle": "360deg",
      transition: {
        opacity: { duration: 0.5, ease: "easeInOut" },
        "--angle": {
          duration: 4,
          repeat: Infinity,
          ease: "linear",
        },
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-center justify-center w-[150px] h-[150px]"
      style={{
        transformStyle: "preserve-3d",
        perspective: 800,
      }}
    >
      {/* 1. プリズマティック効果 (Prismatic Effect) */}
      <motion.div
        className="absolute inset-0 rounded-3xl"
        style={{
          transform: "translateZ(-20px) scale(1.2)",
          background:
            "conic-gradient(from var(--angle), #3b82f6, #8b5cf6, #06b6d4, #10b981, #3b82f6)",
          filter: "blur(25px)",
        }}
        variants={prismaticVariants}
        initial="initial"
        animate={isHovered ? "hover" : "initial"}
      />
      {/* 2. ダイナミックグロー (Dynamic Glow) */}
      <motion.div
        className="absolute inset-[-10px] rounded-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <motion.div
          className="w-full h-full rounded-3xl"
          style={{
            boxShadow:
              "0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.4)",
          }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
      {/* 3. RGBグリッチ分解 (RGB Glitch) */}
      {/* <AnimatePresence>
        {isHovered && (
          <>
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ x: glichX, y: glichY, mixBlendMode: "screen" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Image
                src="/chat-app-icon.png"
                width={150}
                height={150}
                alt=""
                className="rounded-3xl"
                style={{ filter: "hue-rotate(120deg) saturate(2)" }}
                aria-hidden
              />
            </motion.div>
            <motion.div
              className="absolute inset-0 pointer-events-none"
              // 【修正点1】トップレベルで定義したMotionValueを使用
              style={{
                x: glichXInverted,
                y: glichYInverted,
                mixBlendMode: "screen",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Image
                src="/chat-app-icon.png"
                width={150}
                height={150}
                alt=""
                className="rounded-3xl"
                style={{ filter: "hue-rotate(-120deg) saturate(2)" }}
                aria-hidden
              />
            </motion.div>
          </>
        )}
      </AnimatePresence> */}
      {/* 4. メインロゴ & 3D回転 & 磁気追従 */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: "preserve-3d",
          transform: "translateZ(40px)",
        }}
        className="relative"
      >
        <Image
          src="/chat-app-icon.png"
          width={150}
          height={150}
          alt="Oga Space Chat App Logo"
          className="rounded-3xl relative z-10"
          priority
          style={{
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
          }}
        />
        {/* 5. 3Dホログラム効果 (Hologram Effect) */}
        <motion.div
          className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              background:
                "linear-gradient(160deg, transparent 40%, rgba(192, 132, 252, 0.4) 50%, transparent 60%)",
            }}
            animate={{
              y: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2,
            }}
          />
          <motion.div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              background:
                "linear-gradient(200deg, transparent 40%, rgba(59, 130, 246, 0.4) 50%, transparent 60%)",
            }}
            animate={{
              y: ["100%", "-100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.7,
            }}
          />
        </motion.div>
      </motion.div>
      {/* 6. パーティクル爆発 (Particle Burst) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <AnimatePresence>
          {isHovered &&
            Array.from({ length: 20 }).map((_, i) => {
              const angle = (i / 20) * Math.PI * 2;
              const radius = 120;
              const color = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981"][i % 4];
              return (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                  initial={{ x: "-50%", y: "-50%", scale: 0, opacity: 0 }}
                  animate={{
                    x: `calc(-50% + ${Math.cos(angle) * radius}px)`,
                    y: `calc(-50% + ${Math.sin(angle) * radius}px)`,
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    duration: 1.2,
                    ease: "circOut",
                    delay: 0.1 + Math.random() * 0.2,
                  }}
                />
              );
            })}
        </AnimatePresence>
      </div>
      {/* 7. フローティングオーブ (Floating Orbs) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <AnimatePresence>
          {isHovered &&
            Array.from({ length: 6 }).map((_, i) => {
              const angle = (i / 6) * Math.PI * 2;
              const radius = 100;
              const color = ["#3b82f6", "#8b5cf6", "#06b6d4"][i % 3];
              return (
                <motion.div
                  key={i}
                  className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${color}, transparent 60%)`,
                    boxShadow: `0 0 10px ${color}`,
                  }}
                  initial={{
                    x: `calc(-50% + ${Math.cos(angle) * (radius - 20)}px)`,
                    y: `calc(-50% + ${Math.sin(angle) * (radius - 20)}px)`,
                    scale: 0,
                  }}
                  animate={{
                    x: [
                      `calc(-50% + ${Math.cos(angle) * radius}px)`,
                      `calc(-50% + ${Math.cos(angle + Math.PI) * radius}px)`,
                      `calc(-50% + ${
                        Math.cos(angle + Math.PI * 2) * radius
                      }px)`,
                    ],
                    y: [
                      `calc(-50% + ${Math.sin(angle) * radius}px)`,
                      `calc(-50% + ${Math.sin(angle + Math.PI) * radius}px)`,
                      `calc(-50% + ${
                        Math.sin(angle + Math.PI * 2) * radius
                      }px)`,
                    ],
                    scale: [0, 1, 1, 0, 0],
                  }}
                  exit={{ scale: 0 }}
                  transition={{
                    duration: 3,
                    ease: "easeInOut",
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                />
              );
            })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
LogoAnimation.displayName = "LogoAnimation";

export default function WelcomeScreen() {
  const [username, setUsername] = useState("");
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 150 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(springY, [-0.5, 0.5], [7.5, -7.5]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-7.5, 7.5]);
  const translateX = useTransform(springX, [-0.5, 0.5], [-20, 20]);
  const translateY = useTransform(springY, [-0.5, 0.5], [-20, 20]);
  const gradientX = useTransform(springX, [-0.5, 0.5], [0, 100]);
  const gradientY = useTransform(springY, [-0.5, 0.5], [0, 100]);
  const background = useMotionTemplate`radial-gradient(circle at ${gradientX}% ${gradientY}%, rgba(59, 130, 246, 0.15), transparent 50%)`;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX.set(x);
        mouseY.set(y);
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    const orbs = Array.from({ length: 5 }).map((_, i) => {
      const orb = document.createElement("div");
      orb.className = "floating-orb";
      orb.style.cssText = `
        position: fixed;
        width: ${200 + i * 50}px;
        height: ${200 + i * 50}px;
        background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 50%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 1;
        filter: blur(40px);
      `;
      document.body.appendChild(orb);
      gsap.set(orb, {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
      });
      gsap.to(orb, {
        x: `+=${Math.random() * 400 - 200}`,
        y: `+=${Math.random() * 400 - 200}`,
        duration: 15 + i * 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      return orb;
    });

    const particles = Array.from({ length: 30 }).map(() => {
      const particle = document.createElement("div");
      particle.className = "glass-particle";
      particle.style.cssText = `
        position: fixed;
        width: 2px;
        height: 2px;
        background: white;
        border-radius: 50%;
        pointer-events: none;
        z-index: 10;
        box-shadow: 0 0 6px rgba(59, 130, 246, 0.8), 0 0 12px rgba(59, 130, 246, 0.4);
      `;
      document.body.appendChild(particle);
      const tl = gsap.timeline({ repeat: -1, delay: Math.random() * 5 });
      tl.set(particle, {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        opacity: 0,
      })
        .to(particle, {
          y: `-=${Math.random() * 200 + 100}`,
          opacity: 1,
          duration: Math.random() * 2 + 1,
          ease: "power2.out",
        })
        .to(particle, {
          opacity: 0,
          duration: Math.random() * 2 + 1,
          ease: "power2.in",
        });
      return particle;
    });

    return () => {
      orbs.forEach((o) => o.remove());
      particles.forEach((p) => p.remove());
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      localStorage.setItem("username", username.trim());
      router.push("/chat");
    }
  };

  const features = [
    {
      icon: Users,
      label: "つながりの3D可視化",
      delay: 0.2,
      color: "from-blue-400 to-cyan-400",
    },
    {
      icon: MessageSquare,
      label: "リアルタイムなチャット体験",
      delay: 0.3,
      color: "from-indigo-400 to-blue-400",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 overflow-hidden relative flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-slate-900 dark:via-gray-900 dark:to-purple-900/20" />
      <motion.div className="fixed inset-0 opacity-30" style={{ background }} />
      <div className="fixed inset-0 backdrop-blur-[100px]" />

      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.21, 1.11, 0.81, 0.99] }}
        className="relative z-20"
      >
        <motion.div
          style={{
            rotateX,
            rotateY,
            x: translateX,
            y: translateY,
            transformPerspective: 1200,
            transformStyle: "preserve-3d",
          }}
          className="relative"
        >
          <motion.div
            className="absolute -inset-20 rounded-3xl opacity-40"
            animate={{
              background: [
                "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.4), transparent 50%)",
                "radial-gradient(circle at 70% 70%, rgba(139, 92, 246, 0.4), transparent 50%)",
                "radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.4), transparent 50%)",
              ],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            style={{ filter: "blur(60px)" }}
          />

          <Card className="w-full max-w-md backdrop-blur-xl bg-white/70 dark:bg-white/5 shadow-[0_8px_32px_rgba(59,130,246,0.15)] border border-white/20 overflow-visible relative">
            <div className="absolute -top-10 -right-10 w-40 h-40 pointer-events-none">
              <Lottie
                animationData={floatingOrbAnimation}
                className="w-full h-full"
              />
            </div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 pointer-events-none opacity-60">
              <Lottie
                animationData={floatingOrbAnimation}
                className="w-full h-full"
              />
            </div>
            <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
            </div>

            <CardHeader className="space-y-1 relative z-10">
              <motion.div
                initial={{ y: -30, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{
                  delay: 0.2,
                  duration: 0.8,
                  ease: [0.21, 1.11, 0.81, 0.99],
                }}
                className="flex items-center justify-center mb-4" // mb-4を追加してスペースを確保
              >
                {/* === ここを新しいコンポーネントに置き換え === */}
                <LogoAnimation />
              </motion.div>

              <CardTitle className="text-3xl sm:text-4xl font-bold text-center">
                <motion.span
                  className="text-3xl font-bold tracking-tight font-sans bg-gradient-to-r from-indigo-300 to-purple-700 bg-clip-text text-transparent"
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  style={{ backgroundSize: "200% 100%" }}
                >
                  Oga Space へようこそ
                </motion.span>
              </CardTitle>

              <CardDescription className="text-center text-base sm:text-lg pt-2">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col items-center gap-1"
                >
                  <p className="text-gray-700 dark:text-gray-400">
                    重力級のつながり、チャットを超えるリアル体験
                  </p>
                </motion.div>
              </CardDescription>
            </CardHeader>
            {/* 以下、CardContent, CardFooter は変更なし */}
            <CardContent className="space-y-6 relative z-10">
              <div className="flex flex-wrap justify-center gap-4 py-4">
                {features.map((feature) => (
                  <motion.div
                    key={feature.label}
                    variants={{
                      initial: { y: 30, opacity: 0 },
                      animate: {
                        y: 0,
                        opacity: 1,
                        transition: {
                          delay: feature.delay,
                          duration: 0.6,
                          ease: "easeOut",
                        },
                      },
                      hover: {
                        y: -8,
                        scale: 1.05,
                        transition: {
                          type: "spring",
                          stiffness: 300,
                          damping: 15,
                        },
                      },
                    }}
                    initial="initial"
                    animate="animate"
                    whileHover="hover"
                    className="flex-1 min-w-[190px] max-w-[200px]"
                    style={{ transformPerspective: 1000 }}
                  >
                    <div className="relative group cursor-pointer h-full">
                      <motion.div
                        className={`absolute -inset-2 bg-gradient-to-br ${feature.color} rounded-2xl blur-lg`}
                        variants={{
                          hover: { opacity: 0.8 },
                          initial: { opacity: 0 },
                        }}
                        transition={{ duration: 0.3 }}
                      />
                      <div className="relative backdrop-blur-md bg-white/80 dark:bg-white/10 rounded-2xl p-4 border border-white/20 shadow-lg group-hover:shadow-2xl transition-shadow duration-300 h-full flex flex-col items-center justify-center text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div
                            className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} shadow-lg`}
                          >
                            <feature.icon className="h-6 w-6 text-white" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">
                            {feature.label}
                          </span>
                        </div>
                        <motion.div
                          className="absolute inset-0 rounded-2xl overflow-hidden"
                          variants={{
                            hover: { opacity: 1 },
                            initial: { opacity: 0 },
                          }}
                        >
                          <motion.div
                            className="w-full h-full"
                            style={{
                              background:
                                "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.7) 50%, transparent 60%)",
                            }}
                            variants={{
                              hover: {
                                x: "100%",
                                transition: {
                                  duration: 0.8,
                                  ease: "easeInOut",
                                },
                              },
                              initial: { x: "-100%" },
                            }}
                          />
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.form
                onSubmit={handleSubmit}
                variants={{
                  initial: { y: 20, opacity: 0 },
                  animate: { y: 0, opacity: 1, transition: { delay: 0.6 } },
                  hover: {
                    y: -5,
                    scale: 1.01,
                    transition: { type: "spring", stiffness: 300, damping: 20 },
                  },
                }}
                initial="initial"
                animate="animate"
                whileHover="hover"
                className="relative group"
              >
                <motion.div
                  className="absolute -inset-2.5 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl blur-xl"
                  variants={{
                    hover: { opacity: 0.7 },
                    initial: { opacity: 0 },
                  }}
                  transition={{ duration: 0.4 }}
                />
                <div className="relative p-4 backdrop-blur-md bg-white/70 dark:bg-white/10 border border-white/20 rounded-2xl shadow-lg">
                  <div className="space-y-3">
                    <Label
                      htmlFor="username"
                      className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      表示名
                      <motion.div
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="text-blue-500"
                      >
                        ✨
                      </motion.div>
                    </Label>
                    <div className="relative">
                      <Input
                        id="username"
                        placeholder="あなたの名前は？"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="backdrop-blur-sm bg-white/60 dark:bg-white/10 border-white/30 hover:border-blue-300/50 focus:border-blue-500/50 transition-all duration-300 pl-4 pr-12 py-6 text-lg rounded-xl shadow-inner w-full"
                        style={{
                          boxShadow:
                            "inset 0 2px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
                        }}
                      />
                      <AnimatePresence>
                        {username && (
                          <motion.div
                            initial={{ scale: 0, rotate: -180, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            exit={{ scale: 0, rotate: 180, opacity: 0 }}
                            className="absolute right-4 top-1/2 -translate-y-1/2"
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            >
                              <Sparkles className="h-5 w-5 text-blue-500" />
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
                <motion.div
                  className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
                  variants={{ hover: { opacity: 1 }, initial: { opacity: 0 } }}
                >
                  <motion.div
                    className="w-full h-full"
                    style={{
                      background:
                        "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)",
                    }}
                    variants={{
                      hover: {
                        x: "100%",
                        transition: { duration: 1, ease: "easeInOut" },
                      },
                      initial: { x: "-150%" },
                    }}
                  />
                </motion.div>
              </motion.form>
            </CardContent>

            <CardFooter className="relative z-10">
              <motion.div
                className="w-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  className="w-full relative overflow-hidden rounded-xl py-6 font-sans text-white font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl group"
                  onClick={handleSubmit}
                  disabled={!username.trim()}
                  style={{
                    background: username.trim()
                      ? "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)"
                      : "linear-gradient(135deg, #94a3b8 0%, #cbd5e1 100%)",
                    boxShadow: username.trim()
                      ? "0 4px 20px rgba(59, 130, 246, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)"
                      : "0 2px 10px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <motion.div
                    className="absolute inset-0"
                    initial={{ x: "-100%", opacity: 0 }}
                    whileHover={{ x: "0%", opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                    }}
                  />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    飛び込む
                    <Zap className="w-4 h-4 transition-all duration-300 group-hover:translate-x-1 group-hover:text-yellow-300" />
                  </span>
                </Button>
              </motion.div>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>

      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        .floating-orb {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
