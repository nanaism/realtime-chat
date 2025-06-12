"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/types";
import type React from "react";

interface FishAvatarProps {
  user: User;
  isCurrentUser: boolean;
  isTyping: boolean;
  isBeingDragged: boolean;
  position: { x: number; y: number };
  onMouseDown: (e: React.MouseEvent, userId: string) => void;
}

/**
 * 魚型アバターコンポーネント
 * ユーザーを表す魚型アバターを表示し、ドラッグ操作やステータス表示を処理します。
 */
export default function FishAvatar({
  user,
  isCurrentUser,
  isTyping,
  isBeingDragged,
  position,
  onMouseDown,
}: FishAvatarProps) {
  // ユーザーIDからランダムなアニメーション遅延を生成（バラバラに動くように）
  const animDelay = Number.parseInt(user.id.replace(/\D/g, "")) % 5;

  // アバターのスタイル設定
  const userStyle: React.CSSProperties = {
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: "translate(-50%, -50%)",
    transition: isBeingDragged ? "none" : "all 0.3s ease-out",
    position: "absolute",
  };

  // ドラッグ中とそれ以外で異なるアニメーション設定を適用
  if (isBeingDragged) {
    userStyle.animation = "none";
    userStyle.cursor = "grabbing";
    userStyle.zIndex = 30;
  } else {
    userStyle.animationName = "float";
    userStyle.animationDuration = "6s";
    userStyle.animationTimingFunction = "ease-in-out";
    userStyle.animationIterationCount = "infinite";
    userStyle.animationDelay = `${animDelay}s`;
    userStyle.cursor = isCurrentUser ? "grab" : "default";
    userStyle.zIndex = isCurrentUser ? 25 : 20;
  }

  return (
    <div
      key={user.id}
      className="fish-avatar-container"
      style={userStyle}
      onMouseDown={(e) => onMouseDown(e, user.id)}
    >
      <div className="flex flex-col items-center">
        <div className="relative">
          {/* 魚の尾ひれ - アバターの左側に表示される動く尾ひれ */}
          <div
            className={`absolute right-full top-1/2 -translate-y-1/2 w-4 h-8 ${
              isBeingDragged ? "" : "animate-fishtail"
            }`}
            style={{
              backgroundColor: user.color,
              borderTopLeftRadius: "50%",
              borderBottomLeftRadius: "50%",
              transformOrigin: "right center",
            }}
          />

          {/* アバター本体 */}
          <Avatar
            className="h-12 w-12 border-2 shadow-md bg-opacity-70"
            style={{ borderColor: user.color }}
          >
            <AvatarImage src={user.avatar || "/placeholder.svg"} />
            <AvatarFallback style={{ backgroundColor: user.color }}>
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          {/* 泡のアニメーション - ドラッグ中は表示しない */}
          {!isBeingDragged && (
            <>
              <div
                className="absolute -top-2 right-0 w-1 h-1 bg-white/70 rounded-full animate-fishbubble"
                style={{ animationDelay: "0s" }}
              />
              <div
                className="absolute -top-4 right-1 w-2 h-2 bg-white/70 rounded-full animate-fishbubble"
                style={{ animationDelay: "1s" }}
              />
            </>
          )}

          {/* オンライン/タイピング状態を示すステータスインジケーター */}
          <span
            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-sky-800 ${
              isTyping ? "bg-amber-500" : "bg-emerald-500"
            }`}
          ></span>
        </div>

        <div className="mt-1 flex flex-col items-center">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-800/80 text-white shadow-sm backdrop-blur-sm">
            {user.name} {isCurrentUser && "(あなた)"}
          </span>

          {/* タイピング中の場合にバッジを表示 */}
          {isTyping && (
            <Badge
              variant="outline"
              className="mt-1 text-[10px] bg-amber-500/80 text-white border-amber-600 backdrop-blur-sm"
            >
              typing...
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
