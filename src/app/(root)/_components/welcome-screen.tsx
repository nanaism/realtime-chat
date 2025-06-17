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
  MotionValue,
  useAnimationControls, // useTransformのためにインポート
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
  const [clickEffects, setClickEffects] = useState<number[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 15, stiffness: 200, mass: 0.1 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(springY, [-0.5, 0.5], [25, -25]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-25, 25]);
  // ★★★ 修正点: `any` を使わない型安全な useTransform
  const scale = useTransform<number, number>(
    [springX, springY] as MotionValue<number>[],
    ([latestX, latestY]) => 1 + Math.sqrt(latestX ** 2 + latestY ** 2) * 0.1
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

  const handleClick = useCallback(() => {
    const newEffectId = Date.now();
    setClickEffects((prev) => [...prev, newEffectId]);

    // 画面全体に波紋を送る
    const ripple = document.createElement("div");
    ripple.style.cssText = `
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 100vmax;
      height: 100vmax;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.3), transparent 70%);
      pointer-events: none;
      z-index: 100;
    `;
    document.body.appendChild(ripple);

    gsap.fromTo(
      ripple,
      { scale: 0, opacity: 1 },
      {
        scale: 2,
        opacity: 0,
        duration: 1.5,
        ease: "power2.out",
        onComplete: () => ripple.remove(),
      }
    );

    // クリーンアップ
    setTimeout(() => {
      setClickEffects((prev) => prev.filter((id) => id !== newEffectId));
    }, 2000);
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
      onClick={handleClick}
      className="relative flex items-center justify-center w-[150px] h-[150px] cursor-pointer"
      style={{
        transformStyle: "preserve-3d",
        perspective: 800,
      }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
    >
      {/* クリックエフェクト */}
      <AnimatePresence>
        {clickEffects.map((id) => (
          <motion.div
            key={id}
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 爆発する光の輪 */}
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2"
                initial={{ x: "-50%", y: "-50%" }}
                animate={{
                  x: `calc(-50% + ${Math.cos((i / 12) * Math.PI * 2) * 300}px)`,
                  y: `calc(-50% + ${Math.sin((i / 12) * Math.PI * 2) * 300}px)`,
                  opacity: [0, 1, 0],
                  scale: [0, 2, 0],
                }}
                transition={{
                  duration: 1,
                  ease: "easeOut",
                  delay: Math.random() * 0.1,
                }}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${
                      ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981"][i % 4]
                    }, transparent)`,
                    boxShadow: `0 0 20px ${
                      ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981"][i % 4]
                    }`,
                  }}
                />
              </motion.div>
            ))}

            {/* 螺旋状のパーティクル */}
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={`spiral-${i}`}
                className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full"
                style={{
                  background: ["#60a5fa", "#a78bfa", "#34d399", "#fbbf24"][
                    i % 4
                  ],
                }}
                initial={{ x: "-50%", y: "-50%" }}
                animate={{
                  x: `calc(-50% + ${
                    Math.cos((i / 30) * Math.PI * 2 + Date.now() / 1000) *
                    (50 + i * 8)
                  }px)`,
                  y: `calc(-50% + ${
                    Math.sin((i / 30) * Math.PI * 2 + Date.now() / 1000) *
                    (50 + i * 8)
                  }px)`,
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 1.5,
                  ease: "easeOut",
                  delay: i * 0.02,
                }}
              />
            ))}
          </motion.div>
        ))}
      </AnimatePresence>

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
  const [featureClickEffects, setFeatureClickEffects] = useState<{
    [key: string]: number[];
  }>({});

  const buttonRippleControls = useAnimationControls();
  const inputIntroControls = useAnimationControls();

  const [isPlaceholderVisible, setIsPlaceholderVisible] = useState(true);
  const placeholderText = "あなたの名前は？";
  const [startTypingAnimation, setStartTypingAnimation] = useState(false);

  const particleContainerRef = useRef<HTMLDivElement>(null);
  const hiddenCaretDivRef = useRef<HTMLDivElement | null>(null);

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
      setStartTypingAnimation(true);
    }, 1200);

    return () => clearTimeout(introTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const div = document.createElement("div");
    hiddenCaretDivRef.current = div;
    document.body.appendChild(div);

    const syncStyle = () => {
      if (!hiddenCaretDivRef.current) return;
      const style = window.getComputedStyle(input);
      // ★★★ 修正点: `any` を使わず、安全なCSSプロパティのリストを使用
      const props: (keyof CSSStyleDeclaration)[] = [
        "font",
        "letterSpacing",
        "wordSpacing",
        "lineHeight",
        "textTransform",
        "textIndent",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "borderTopWidth",
        "borderRightWidth",
        "borderBottomWidth",
        "borderLeftWidth",
      ];
      props.forEach((prop) => {
        // ★★★ 修正点: setProperty を使用して型安全にスタイルをセット
        hiddenCaretDivRef.current?.style.setProperty(
          prop as string,
          style.getPropertyValue(prop as string)
        );
      });
      div.style.position = "absolute";
      div.style.visibility = "hidden";
      div.style.whiteSpace = "pre-wrap";
      div.style.top = "0";
      div.style.left = "0";
    };

    syncStyle();

    window.addEventListener("resize", syncStyle);

    return () => {
      if (hiddenCaretDivRef.current) {
        document.body.removeChild(hiddenCaretDivRef.current);
        hiddenCaretDivRef.current = null;
      }
      window.removeEventListener("resize", syncStyle);
    };
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

  const handleFeatureClick = (
    featureLabel: string,
    event: React.MouseEvent
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const effectId = Date.now();
    setFeatureClickEffects((prev) => ({
      ...prev,
      [featureLabel]: [...(prev[featureLabel] || []), effectId],
    }));
    setTimeout(() => {
      setFeatureClickEffects((prev) => ({
        ...prev,
        [featureLabel]:
          prev[featureLabel]?.filter((id) => id !== effectId) || [],
      }));
    }, 2000);

    const colors = featureLabel.includes("つながり")
      ? ["#60a5fa", "#3b82f6", "#2563eb"]
      : ["#a78bfa", "#8b5cf6", "#7c3aed"];

    const warpElement = document.createElement("div");
    warpElement.style.cssText = `
      position: fixed;
      left: ${centerX}px;
      top: ${centerY}px;
      transform: translate(-50%, -50%);
      width: 100vmax;
      height: 100vmax;
      border-radius: 50%;
      pointer-events: none;
      z-index: 999;
      background: radial-gradient(circle, transparent 0%, rgba(139, 92, 246, 0.05) 20%, transparent 40%);
      backdrop-filter: blur(0px);
    `;
    document.body.appendChild(warpElement);
    gsap.timeline().fromTo(
      warpElement,
      { scale: 0, opacity: 1 },
      {
        scale: 2.5,
        opacity: 0,
        duration: 1.2,
        ease: "expo.out",
        onUpdate: function () {
          const progress = this.progress();
          const blurAmount = Math.sin(progress * Math.PI) * 4;
          warpElement.style.backdropFilter = `blur(${blurAmount}px)`;
        },
        onComplete: () => warpElement.remove(),
      }
    );

    const particleCount = 40;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      const angle = Math.random() * Math.PI * 2;
      const velocity = 100 + Math.random() * 250;
      const size = 1.5 + Math.random() * 2.5;
      particle.style.cssText = `
        position: fixed;
        left: ${centerX}px;
        top: ${centerY}px;
        width: ${size}px;
        height: ${size}px;
        background: ${colors[i % colors.length]};
        border-radius: 50%;
        pointer-events: none;
        z-index: 1001;
        box-shadow: 0 0 ${size * 2}px ${colors[i % colors.length]};
      `;
      document.body.appendChild(particle);
      gsap.to(particle, {
        x: Math.cos(angle) * velocity,
        y: Math.sin(angle) * velocity,
        opacity: 0,
        scale: 0,
        duration: 1.2 + Math.random() * 0.8,
        ease: "power3.out",
        onComplete: () => particle.remove(),
      });
    }
  };

  const createTypingParticle = useCallback((x: number, y: number) => {
    const container = particleContainerRef.current;
    if (!container) return;

    const particleCount = Math.floor(Math.random() * 4) + 3; // 3-6個
    const colors = ["#ffbe0b", "#fb5607", "#ff006e", "#8338ec", "#3a86ff"];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      container.appendChild(particle);
      const size = Math.random() * 5 + 2;
      const color1 = colors[Math.floor(Math.random() * colors.length)];
      const color2 = colors[Math.floor(Math.random() * colors.length)];

      gsap.set(particle, {
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color1}, ${color2})`,
        opacity: 1,
        scale: 1,
      });

      const angle = Math.random() * Math.PI * 2 - Math.PI / 2; // 上方向に飛散しやすく
      const velocity = Math.random() * 60 + 30;

      gsap.to(particle, {
        x: `+=${Math.cos(angle) * velocity}`,
        y: `+=${Math.sin(angle) * velocity - 10}`, // 少し上向きに
        opacity: 0,
        scale: 0,
        duration: Math.random() * 0.6 + 0.5,
        ease: "power2.out",
        onComplete: () => {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
          }
        },
      });
    }
  }, []);

  const handleUsernameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const value = input.value;
      const prevValue = username;

      setUsername(value);
      setIsPlaceholderVisible(value === "");
      if (error) setError(null);

      if (value.length < prevValue.length) return;

      const hiddenDiv = hiddenCaretDivRef.current;
      if (hiddenDiv && inputRef.current) {
        const inputRect = inputRef.current.getBoundingClientRect();
        const selectionEnd = input.selectionEnd || 0;

        const textBeforeCaret = value.substring(0, selectionEnd);
        hiddenDiv.textContent = textBeforeCaret;

        const caretSpan = document.createElement("span");
        hiddenDiv.appendChild(caretSpan);

        const caretRect = caretSpan.getBoundingClientRect();

        const x = caretRect.left + window.scrollX;
        const y = inputRect.top + inputRect.height / 2 + window.scrollY;

        createTypingParticle(x, y);

        hiddenDiv.removeChild(caretSpan);
      }
    },
    [username, error, createTypingParticle]
  );

  const features = [
    {
      icon: Users,
      label: "つながりの3D可視化",
      delay: 0.2,
      color: "from-red-300 to-sky-400",
      shadowColor: "rgba(14, 165, 233, 0.4)",
    },
    {
      icon: MessageSquare,
      label: "リアルタイムなチャット体験",
      delay: 0.3,
      color: "from-yellow-300 to-green-500",
      shadowColor: "rgba(139, 92, 246, 0.4)",
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

  const containerVariants: Variants = {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.21, 1.11, 0.81, 0.99],
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 overflow-hidden relative flex items-center justify-center p-4">
      <div
        ref={particleContainerRef}
        className="fixed inset-0 pointer-events-none z-[9999]"
      />

      <div className="fixed inset-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-slate-900 dark:via-gray-900 dark:to-purple-900/20" />
      <motion.div className="fixed inset-0 opacity-30" style={{ background }} />
      <div className="fixed inset-0 backdrop-blur-[100px]" />

      <motion.div
        ref={containerRef}
        variants={containerVariants}
        initial="initial"
        animate="animate"
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
                variants={itemVariants}
                className="flex items-center justify-center mb-4"
              >
                <LogoAnimation />
              </motion.div>

              <motion.div variants={itemVariants}>
                <CardTitle className="text-3xl sm:text-4xl font-bold text-center">
                  <motion.span
                    className="text-3xl font-bold tracking-tight font-sans bg-gradient-to-r from-yellow-400 to-red-500 bg-clip-text text-transparent"
                    animate={{
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{ backgroundSize: "200% 100%" }}
                  >
                    Oga Space へようこそ
                  </motion.span>
                </CardTitle>

                <CardDescription className="text-center text-base sm:text-lg pt-2">
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-gray-700 dark:text-gray-400 font-sans font-bold">
                      &quot;重力級&quot;のつながり、チャットを超えるリアル
                    </p>
                  </div>
                </CardDescription>
              </motion.div>
            </CardHeader>

            <CardContent className="space-y-6 relative z-10">
              <motion.div
                variants={itemVariants}
                className="flex flex-wrap justify-center gap-4 py-4"
              >
                {features.map((feature) => (
                  <motion.div
                    key={feature.label}
                    whileHover={{
                      y: -8,
                      scale: 1.05,
                      transition: {
                        type: "spring",
                        stiffness: 300,
                        damping: 15,
                      },
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => handleFeatureClick(feature.label, e)}
                    className="flex-1 min-w-[190px] max-w-[200px] cursor-pointer"
                    style={{ transformPerspective: 1000 }}
                  >
                    <div className="relative group h-full">
                      <AnimatePresence>
                        {featureClickEffects[feature.label]?.map((id) => (
                          <motion.div
                            key={id}
                            className="absolute inset-0 rounded-2xl pointer-events-none z-0"
                            initial={{ scale: 0.5, opacity: 1 }}
                            animate={{
                              scale: 2,
                              opacity: 0,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            style={{
                              background: `radial-gradient(circle, ${feature.shadowColor}, transparent 70%)`,
                            }}
                          />
                        ))}
                      </AnimatePresence>

                      <motion.div
                        className={`absolute -inset-2 bg-gradient-to-br ${feature.color} rounded-2xl blur-lg transition-opacity duration-300 group-hover:opacity-80 opacity-0`}
                      />
                      <div className="relative backdrop-blur-md bg-white/80 dark:bg-white/10 rounded-2xl p-4 border border-white/20 shadow-lg group-hover:shadow-2xl transition-shadow duration-300 h-full flex flex-col items-center justify-center text-center">
                        <div className="flex flex-col items-center gap-3">
                          <motion.div
                            className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} shadow-lg`}
                            whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                            transition={{ duration: 0.5 }}
                          >
                            <feature.icon className="h-6 w-6 text-white" />
                          </motion.div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight font-sans">
                            {feature.label}
                          </span>
                        </div>
                        <motion.div
                          className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
                          initial={{ opacity: 0 }}
                          whileHover={{ opacity: 1 }}
                        >
                          <motion.div
                            className="w-full h-full"
                            style={{
                              background:
                                "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.7) 50%, transparent 60%)",
                            }}
                            initial={{ x: "-100%" }}
                            animate={{ x: "100%" }}
                            transition={{
                              duration: 0.8,
                              ease: "easeInOut",
                              repeat: Infinity,
                              repeatDelay: 0.5,
                            }}
                          />
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <motion.form
                ref={formRef}
                onSubmit={handleSubmit}
                variants={itemVariants}
                whileHover={{
                  y: -5,
                  scale: 1.01,
                  transition: { type: "spring", stiffness: 300, damping: 20 },
                }}
                className="relative group"
              >
                <motion.div className="absolute -inset-2.5 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-400" />
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
                            <motion.span
                              key={i}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{
                                opacity: startTypingAnimation ? 1 : 0,
                                y: startTypingAnimation ? 0 : 5,
                              }}
                              transition={{
                                type: "spring",
                                damping: 15,
                                stiffness: 300,
                                duration: 0.2,
                                delay: startTypingAnimation
                                  ? i * 0.07 + 0.5
                                  : 0,
                              }}
                              className="inline-block"
                            >
                              {char === " " ? "\u00A0" : char}
                            </motion.span>
                          ))}
                        </div>
                      )}

                      <MotionInput
                        ref={inputRef}
                        id="username"
                        placeholder=""
                        value={username}
                        onChange={handleUsernameChange}
                        required
                        disabled={isLoading}
                        className="font-sans caret-blue-500 dark:caret-blue-400 backdrop-blur-sm bg-white/60 dark:bg-white/10 border-white/30 hover:border-blue-300/50 focus:border-blue-500/50 pl-4 pr-12 py-6 text-lg rounded-xl shadow-inner w-full relative"
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
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                >
                  <motion.div
                    className="w-full h-full"
                    style={{
                      background:
                        "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)",
                    }}
                    initial={{ x: "-150%" }}
                    animate={{ x: "100%" }}
                    transition={{
                      duration: 1.2,
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatDelay: 0.8,
                    }}
                  />
                </motion.div>
              </motion.form>
            </CardContent>

            <CardFooter className="relative z-10">
              <motion.div
                variants={itemVariants}
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
