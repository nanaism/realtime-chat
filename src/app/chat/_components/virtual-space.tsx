"use client";

import type { User } from "@/lib/types";
import { throttle } from "lodash";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import FishAvatar from "./fish-avatar";

interface VirtualSpaceProps {
  users: User[];
  currentUser: string;
  typingUsers: string[];
  onUserMove: (userId: string, newPosition: { x: number; y: number }) => void;
}

/**
 * 泡のUIコンポーネント
 * アクアリウム内の泡を表示するための単一の泡要素
 */
const Bubble = ({
  size,
  duration,
  delay,
  left,
}: {
  size: number;
  duration: number;
  delay: number;
  left: string;
}) => (
  <div
    className="absolute rounded-full bg-white/30 animate-rise"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      bottom: "-20px",
      left,
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
    }}
  />
);

/**
 * 指定された数の泡をランダムな大きさ、時間、位置で生成する
 */
const generateBubbles = (count: number) => {
  const bubbles = [];
  for (let i = 0; i < count; i++) {
    bubbles.push({
      id: i,
      size: Math.random() * 10 + 5,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5,
      left: `${Math.random() * 100}%`,
    });
  }
  return bubbles;
};

/**
 * バーチャルオフィスコンポーネント
 * 水族館のようなインタラクティブな空間内にユーザーアバターを表示します。
 * アバターのドラッグ＆ドロップによる移動、アニメーション、および水中効果を処理します。
 */
export default function VirtualSpace({
  users,
  currentUser,
  typingUsers,
  onUserMove,
}: VirtualSpaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [bubbles] = useState(() => generateBubbles(20));
  const [localPosition, setLocalPosition] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  const mouseStartPositionRef = useRef<{ x: number; y: number } | null>(null);

  // 位置更新の送信を制限するためにthrottleを適用
  const throttledSendPosition = useRef(
    throttle((userId: string, newPosition: { x: number; y: number }) => {
      onUserMove(userId, newPosition);
    }, 100)
  ).current;

  // コンテナのサイズを設定し、リサイズイベントをリッスン
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  /**
   * アバターのドラッグ開始を処理する
   * 現在のユーザーのアバターのみドラッグ操作を許可
   */
  const handleMouseDown = (e: React.MouseEvent, userId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const userToMove = users.find((u) => u.id === userId);
    if (!userToMove || userToMove.name !== currentUser) return;

    setDragging(userId);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    mouseStartPositionRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    dragStartPositionRef.current = { ...userToMove.position };

    setLocalPosition({
      id: userId,
      x: userToMove.position.x,
      y: userToMove.position.y,
    });
  };

  /**
   * アバターのドラッグ中の移動を処理する
   * ドラッグ中のアバターの位置を更新し、コンテナ境界内に制限
   */
  const handleMouseMove = (e: React.MouseEvent) => {
    if (
      !dragging ||
      !containerRef.current ||
      !dragStartPositionRef.current ||
      !mouseStartPositionRef.current
    )
      return;

    const rect = containerRef.current.getBoundingClientRect();

    const deltaX = e.clientX - rect.left - mouseStartPositionRef.current.x;
    const deltaY = e.clientY - rect.top - mouseStartPositionRef.current.y;

    let newX = dragStartPositionRef.current.x + deltaX;
    let newY = dragStartPositionRef.current.y + deltaY;

    // 画面外にアバターが出ないように制限
    newX = Math.max(20, Math.min(containerSize.width - 40, newX));
    newY = Math.max(20, Math.min(containerSize.height - 40, newY));

    setLocalPosition({
      id: dragging,
      x: newX,
      y: newY,
    });

    throttledSendPosition(dragging, { x: newX, y: newY });
  };

  /**
   * ドラッグ終了時の処理
   * 最終位置を確定して通知
   */
  const handleMouseUp = () => {
    if (dragging && localPosition) {
      onUserMove(dragging, { x: localPosition.x, y: localPosition.y });
      setDragging(null);
      setLocalPosition(null);
      dragStartPositionRef.current = null;
      mouseStartPositionRef.current = null;
    }
  };

  /**
   * コンテナ自体のマウスダウンイベントを処理
   * 空白部分をクリックした場合はドラッグを終了
   */
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleMouseUp();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #0c4a6e 0%, #0369a1 50%, #0284c7 100%)",
      }}
      onMouseDown={handleContainerMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 水中の光と色の効果 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-20 h-full bg-cyan-200 blur-3xl transform -rotate-45" />
        <div className="absolute top-0 right-1/4 w-20 h-full bg-cyan-200 blur-3xl transform rotate-45" />
      </div>

      {/* 泡のアニメーション */}
      {bubbles.map((bubble) => (
        <Bubble
          key={bubble.id}
          size={bubble.size}
          duration={bubble.duration}
          delay={bubble.delay}
          left={bubble.left}
        />
      ))}

      {/* 砂床 */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-amber-200/30" />

      {/* 水草の装飾 - 左側 */}
      <div className="absolute bottom-0 left-[10%] w-16 h-40">
        <div
          className="absolute bottom-0 w-4 h-32 bg-emerald-700 rounded-full animate-sway"
          style={{ animationDelay: "0.5s", transformOrigin: "bottom" }}
        />
        <div
          className="absolute bottom-0 left-6 w-4 h-40 bg-emerald-800 rounded-full animate-sway"
          style={{ animationDelay: "0s", transformOrigin: "bottom" }}
        />
        <div
          className="absolute bottom-0 left-12 w-4 h-36 bg-emerald-700 rounded-full animate-sway"
          style={{ animationDelay: "1s", transformOrigin: "bottom" }}
        />
      </div>

      {/* 水草の装飾 - 右側 */}
      <div className="absolute bottom-0 left-[70%] w-16 h-32">
        <div
          className="absolute bottom-0 w-4 h-32 bg-emerald-600 rounded-full animate-sway"
          style={{ animationDelay: "0.7s", transformOrigin: "bottom" }}
        />
        <div
          className="absolute bottom-0 left-6 w-4 h-28 bg-emerald-700 rounded-full animate-sway"
          style={{ animationDelay: "0.2s", transformOrigin: "bottom" }}
        />
        <div
          className="absolute bottom-0 left-12 w-4 h-36 bg-emerald-600 rounded-full animate-sway"
          style={{ animationDelay: "1.2s", transformOrigin: "bottom" }}
        />
      </div>

      {/* タイトル */}
      <div className="absolute top-4 left-0 right-0 text-center z-10">
        <h2 className="text-xl font-bold text-cyan-100 tracking-widest drop-shadow-lg">
          AQUARIUM WORKSPACE
        </h2>
      </div>

      {/* ユーザーアバターの表示 */}
      {users.map((user) => {
        const isCurrent = user.name === currentUser;
        const isTyping = typingUsers.includes(user.name);
        const isBeingDragged = dragging === user.id;
        const currentPosition =
          isBeingDragged && localPosition && localPosition.id === user.id
            ? { x: localPosition.x, y: localPosition.y }
            : user.position;

        return (
          <FishAvatar
            key={user.id}
            user={user}
            isCurrentUser={isCurrent}
            isTyping={isTyping}
            isBeingDragged={isBeingDragged}
            position={currentPosition}
            onMouseDown={handleMouseDown}
          />
        );
      })}

      {/* ステータス表示 */}
      <div className="absolute bottom-4 left-4 text-white text-sm z-10 bg-sky-900/50 px-3 py-1 rounded-full backdrop-blur-sm">
        <p>Sakana: {users.length}</p>
      </div>
    </div>
  );
}
