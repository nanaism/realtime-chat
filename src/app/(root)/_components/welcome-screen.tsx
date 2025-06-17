// WelcomeScreen.tsx

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
  useAnimationControls,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  Variants,
} from "framer-motion";
import gsap from "gsap";
import Lottie from "lottie-react";
import { MessageSquare, Sparkles, Users, Zap } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type React from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

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
const LogoAnimation = memo(() => {
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 15, stiffness: 200, mass: 0.1 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

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

const MotionInput = motion(Input);

export default function WelcomeScreen() {
  const [username, setUsername] = useState("");
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buttonRippleControls = useAnimationControls();
  const inputIntroControls = useAnimationControls();

  const [isPlaceholderVisible, setIsPlaceholderVisible] = useState(true);
  const placeholderText = "あなたの名前は？";

  // ★★★ 修正1: アニメーション制御用のstateを追加
  const [startTypingAnimation, setStartTypingAnimation] = useState(false);

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
    const introTimer = setTimeout(() => {
      inputRef.current?.focus();
      inputIntroControls.start("animate");

      // ★★★ 修正2: stateを更新してアニメーションをトリガー
      setStartTypingAnimation(true);
    }, 1200);

    return () => clearTimeout(introTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!username.trim() || isLoading) return;

    buttonRippleControls.start({
      scale: 1,
      boxShadow: [
        "0 0 0 0px rgba(59, 130, 246, 0.4)",
        "0 0 0 40px rgba(59, 130, 246, 0)",
      ],
      transition: { duration: 0.6, ease: "easeOut" },
    });

    setError(null);
    setIsLoading(true);

    const socket: Socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "");

    socket.on("connect", () => {
      console.log("名前チェック用のソケット接続完了:", socket.id);
      socket.emit(
        "user:check_name",
        username.trim(),
        (response: { available: boolean; message: string }) => {
          if (response.available) {
            localStorage.setItem("username", username.trim());
            router.push("/chat");
          } else {
            setError(response.message);
            setIsLoading(false);
          }
          socket.disconnect();
        }
      );
    });

    socket.on("connect_error", () => {
      setError(
        "サーバーに接続できませんでした。時間をおいて再試行してください。"
      );
      setIsLoading(false);
      socket.disconnect();
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!username.trim() || isLoading || e.button !== 0) {
      return;
    }
    formRef.current?.requestSubmit();
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

  const inputIntroVariants: Variants = {
    initial: {
      scale: 1,
      opacity: 0,
    },
    animate: {
      scale: 1.3,
      opacity: [0, 0.8, 0],
      transition: {
        duration: 0.7,
        ease: "circOut",
      },
    },
  };

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
                className="flex items-center justify-center mb-4"
              >
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
                  <p className="text-gray-700 dark:text-gray-400 font-sans font-bold">
                    &quot;重力級&quot;のつながり、チャットを超えるリアル
                  </p>
                </motion.div>
              </CardDescription>
            </CardHeader>

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
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight font-sans">
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
                ref={formRef}
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
                      className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 font-sans"
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
                    <div className="relative font-sans">
                      <motion.div
                        className="absolute -inset-0.5 rounded-xl border-2 border-blue-400 pointer-events-none"
                        variants={inputIntroVariants}
                        initial="initial"
                        animate={inputIntroControls}
                      />

                      {isPlaceholderVisible && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-lg text-gray-400 dark:text-gray-500 z-10">
                          {placeholderText.split("").map((char, i) => (
                            // ★★★ 修正3: stateを使ってアニメーションを宣言的に制御
                            <motion.span
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{
                                opacity: startTypingAnimation ? 1 : 0,
                              }}
                              transition={{
                                duration: 0.1,
                                delay: startTypingAnimation
                                  ? i * 0.07 + 0.5
                                  : 0,
                              }}
                            >
                              {char}
                            </motion.span>
                          ))}
                        </div>
                      )}

                      <MotionInput
                        ref={inputRef}
                        id="username"
                        placeholder=""
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setIsPlaceholderVisible(e.target.value === "");
                          if (error) setError(null);
                        }}
                        required
                        disabled={isLoading}
                        className="font-sans  caret-blue-500 dark:caret-blue-400 backdrop-blur-sm bg-white/60 dark:bg-white/10 border-white/30 hover:border-blue-300/50 focus:border-blue-500/50 pl-4 pr-12 py-6 text-lg rounded-xl shadow-inner w-full relative"
                        whileFocus={{
                          boxShadow: [
                            "inset 0 2px 4px rgba(0,0,0,0.06), 0 0 0px 0px rgba(59, 130, 246, 0.3)",
                            "inset 0 2px 4px rgba(0,0,0,0.06), 0 0 15px 3px rgba(59, 130, 246, 0.3)",
                            "inset 0 2px 4px rgba(0,0,0,0.06), 0 0 0px 0px rgba(59, 130, 246, 0.3)",
                          ],
                          transition: {
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          },
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 15,
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

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm font-medium text-red-500 text-center pt-2 font-sans"
                          aria-live="polite"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>
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
                whileHover={{
                  scale: !isLoading ? 1.07 : 1,
                  y: !isLoading ? -6 : 0,
                }}
                whileTap={{
                  scale: !isLoading ? 0.96 : 1,
                  y: !isLoading ? 3 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Button
                  type="submit"
                  className="w-full relative overflow-hidden rounded-xl py-6 font-sans text-white font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-2xl group"
                  onPointerDown={handlePointerDown}
                  disabled={!username.trim() || isLoading}
                  style={{
                    background:
                      !username.trim() || isLoading
                        ? "linear-gradient(135deg, #94a3b8 0%, #cbd5e1 100%)"
                        : "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                    boxShadow:
                      !username.trim() || isLoading
                        ? "0 2px 10px rgba(0, 0, 0, 0.1)"
                        : "0 4px 20px rgba(59, 130, 246, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)",
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
                  <motion.div
                    className="absolute inset-0 rounded-xl"
                    style={{ pointerEvents: "none" }}
                    animate={buttonRippleControls}
                  />
                  <span className="relative z-10 flex items-center justify-center gap-2 font-sans">
                    {isLoading ? "認証中..." : "飛び込む"}
                    {!isLoading && (
                      <Zap className="w-4 h-4 transition-all duration-300 group-hover:translate-x-1 group-hover:text-yellow-300" />
                    )}
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
