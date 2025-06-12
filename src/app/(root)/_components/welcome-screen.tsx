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
  useMotionValue,
  useTransform,
} from "framer-motion";
import gsap from "gsap";
import Lottie from "lottie-react";
import { MessageSquare, Sparkles, Users, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useRef, useState } from "react";

// Lottie アニメーションデータ（簡易版）
const fishAnimation = {
  v: "5.5.7",
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  nm: "Fish",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Fish",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: {
          a: 1,
          k: [
            { t: 0, s: [0], e: [10] },
            { t: 30, s: [10], e: [-10] },
            { t: 60, s: [-10] },
          ],
        },
        p: {
          a: 1,
          k: [
            { t: 0, s: [50, 50, 0], e: [60, 45, 0] },
            { t: 30, s: [60, 45, 0], e: [40, 55, 0] },
            { t: 60, s: [40, 55, 0] },
          ],
        },
        a: { a: 0, k: [50, 50, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "sh",
              d: 1,
              ks: {
                a: 0,
                k: {
                  i: [
                    [0, 0],
                    [-20, 0],
                    [0, 0],
                    [5, -5],
                    [5, 5],
                  ],
                  o: [
                    [0, 0],
                    [20, 0],
                    [0, 0],
                    [-5, 5],
                    [-5, -5],
                  ],
                  v: [
                    [-30, 0],
                    [0, -15],
                    [30, 0],
                    [20, 0],
                    [30, 0],
                  ],
                  c: true,
                },
              },
            },
            {
              ty: "fl",
              c: { a: 0, k: [0.2, 0.6, 1, 1] },
            },
          ],
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
    },
  ],
};

const sparkleAnimation = {
  v: "5.5.7",
  fr: 30,
  ip: 0,
  op: 90,
  w: 50,
  h: 50,
  nm: "Sparkle",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Sparkle",
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [0], e: [100] },
            { t: 45, s: [100], e: [0] },
            { t: 90, s: [0] },
          ],
        },
        r: {
          a: 1,
          k: [
            { t: 0, s: [0], e: [180] },
            { t: 90, s: [180] },
          ],
        },
        p: { a: 0, k: [25, 25, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [0, 0, 100], e: [100, 100, 100] },
            { t: 45, s: [100, 100, 100], e: [0, 0, 100] },
            { t: 90, s: [0, 0, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: "sr",
          p: { a: 0, k: [0, 0] },
          s: { a: 0, k: [30, 30] },
          r: { a: 0, k: 0 },
          pt: { a: 0, k: 4 },
          sy: 1,
          or: { a: 0, k: 15 },
          os: { a: 0, k: 0 },
          ir: { a: 0, k: 5 },
          is: { a: 0, k: 0 },
        },
        {
          ty: "fl",
          c: { a: 0, k: [1, 0.8, 0.2, 1] },
        },
      ],
    },
  ],
};

export default function WelcomeScreen() {
  const [username, setUsername] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-10, 10]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    // GSAP パーティクルアニメーション
    const particles = Array.from({ length: 20 }).map((_, i) => {
      const particle = document.createElement("div");
      particle.className = "particle";
      particle.style.cssText = `
        position: fixed;
        width: 4px;
        height: 4px;
        background: radial-gradient(circle, rgba(59, 130, 246, 0.8), transparent);
        border-radius: 50%;
        pointer-events: none;
        z-index: 50;
      `;
      document.body.appendChild(particle);

      gsap.set(particle, {
        x: Math.random() * window.innerWidth,
        y: window.innerHeight + 20,
      });

      gsap.to(particle, {
        y: -20,
        x: `+=${Math.random() * 200 - 100}`,
        duration: Math.random() * 3 + 2,
        repeat: -1,
        ease: "none",
        delay: Math.random() * 2,
      });

      return particle;
    });

    return () => {
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
    { icon: Users, label: "参加者をみえる化", delay: 0.2 },
    { icon: MessageSquare, label: "リアルタイムチャット", delay: 0.3 },
    { icon: Zap, label: "即時更新", delay: 0.4 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative"
    >
      {/* 背景のグロー効果 */}
      <motion.div
        className="absolute inset-0 blur-3xl opacity-30"
        animate={{
          background: [
            "radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%)",
            "radial-gradient(circle at 80% 50%, #8b5cf6 0%, transparent 50%)",
            "radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />

      <motion.div
        ref={cardRef}
        style={{
          rotateX,
          rotateY,
          transformPerspective: 1000,
          transformStyle: "preserve-3d",
        }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <Card
          className="w-full max-w-md shadow-2xl backdrop-blur-lg bg-white/90 dark:bg-blue-950/90 border-blue-200/20 dark:border-blue-700/20 overflow-hidden"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* ヘッダーの装飾 */}
          <div className="absolute top-0 left-0 w-full h-40 overflow-hidden">
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  "linear-gradient(45deg, #3b82f6 0%, #8b5cf6 100%)",
                  "linear-gradient(45deg, #8b5cf6 0%, #ec4899 100%)",
                  "linear-gradient(45deg, #ec4899 0%, #3b82f6 100%)",
                ],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{ opacity: 0.1 }}
            />
          </div>

          <CardHeader className="space-y-1 relative z-10">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex items-center justify-center mb-4"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-50"
                />
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-4">
                  <Sparkles className="h-12 w-12 text-white" />
                </div>
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-2 -right-2"
                    >
                      <Lottie
                        animationData={sparkleAnimation}
                        className="w-8 h-8"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Oga Office へようこそ！
            </CardTitle>
            <CardDescription className="text-center text-lg">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="inline-flex items-center gap-2"
              >
                オンライン上の作業スペースに参加
                <Sparkles className="h-4 w-4 text-yellow-500" />
              </motion.span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 relative z-10">
            {/* 機能アイコン */}
            <div className="flex justify-around py-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: feature.delay, duration: 0.6 }}
                  whileHover={{ scale: 1.1, y: -5 }}
                  className="flex flex-col w-1/3 items-center gap-2 group cursor-pointer"
                >
                  <motion.div
                    className="relative p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all duration-300"
                    whileHover={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.4 }}
                  >
                    <feature.icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      animate={{
                        boxShadow: [
                          "0 0 0 0 rgba(59, 130, 246, 0)",
                          "0 0 0 10px rgba(59, 130, 246, 0.1)",
                          "0 0 0 0 rgba(59, 130, 246, 0)",
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.2,
                      }}
                    />
                  </motion.div>
                  <span className="text-xs font-medium text-center group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {feature.label}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* 入力フォーム */}
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="text-lg font-semibold flex items-center gap-2"
                >
                  表示名
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Lottie
                      animationData={fishAnimation}
                      className="w-6 h-6 inline-block"
                    />
                  </motion.div>
                </Label>
                <motion.div whileFocus={{ scale: 1.02 }} className="relative">
                  <Input
                    id="username"
                    placeholder="表示名を入力してください"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-white/80 dark:bg-blue-900/80 backdrop-blur-sm border-blue-300/50 dark:border-blue-700/50 focus:border-blue-500 transition-all duration-300 pl-4 pr-10"
                  />
                  <AnimatePresence>
                    {username && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </motion.form>
          </CardContent>

          <CardFooter>
            <motion.div
              className="w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-lg py-6 relative overflow-hidden group"
                onClick={handleSubmit}
                disabled={!username.trim()}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6 }}
                  style={{ opacity: 0.3 }}
                />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  参加する
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.div>
                </span>
              </Button>
            </motion.div>
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  );
}
