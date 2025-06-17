"use client";

import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageSquare,
  MessageSquareReply,
  MousePointer2,
  Smile,
  Sparkles,
} from "lucide-react";
import type React from "react";

interface InfoDialogProps {
  onClose: () => void;
}

const features = [
  {
    icon: MessageSquare,
    title: "リアルタイムチャット",
    description: "世界中の人と、瞬時に言葉を交わそう。",
    color: "from-blue-400 to-cyan-400",
  },
  {
    icon: MousePointer2,
    title: "バーチャル空間",
    description: "アバターを動かして、空間を自由に探索。",
    color: "from-violet-400 to-purple-400",
  },
  {
    icon: Smile,
    title: "豊かなリアクション",
    description: "絵文字で、言葉以上の感情を伝えよう。",
    color: "from-pink-400 to-rose-400",
  },
  {
    icon: MessageSquareReply,
    title: "会話を繋ぐリプライ",
    description: "特定のメッセージに返信して、会話を整理。",
    color: "from-amber-400 to-orange-400",
  },
];

const InfoDialog: React.FC<InfoDialogProps> = ({ onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Dialog Content */}
      <motion.div
        initial={{ y: 50, scale: 0.9, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 50, scale: 0.9, opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          duration: 0.5,
        }}
        className="relative w-full max-w-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-br from-blue-500/20 via-transparent to-violet-500/20 z-100" />

        <div className="p-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
              className="inline-block p-3 bg-gradient-to-r from-blue-500 to-violet-500 rounded-2xl shadow-lg mb-4"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-3xl font-bold font-sans tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2">
              Oga Spaceへようこそ！
            </h2>
            <p className="text-slate-600 dark:text-slate-400 font-sans">
              ここでは、こんな体験があなたを待っています。
            </p>
          </div>

          <div className="space-y-6">
            <AnimatePresence>
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1, ease: "easeOut" }}
                  className="flex items-start gap-4"
                >
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg`}
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, ease: "easeOut" }}
            className="mt-10"
          >
            <Button
              onClick={onClose}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white rounded-2xl shadow-lg shadow-blue-500/30 transition-all duration-300 transform hover:scale-105"
            >
              チャットを始める
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default InfoDialog;
