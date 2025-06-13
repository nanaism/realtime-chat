"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Send } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";

interface ChatInterfaceProps {
  messages: Message[];
  typingUsers: string[];
  currentUser: string;
  inputValue: string;
  setInputValue: (value: string) => void;
  onSendMessage: () => void;
}

/**
 * チャットインターフェースのメインコンポーネント
 * メッセージリスト、入力フィールド、送信ボタンなど、チャット機能の主要なUI要素を表示します。
 */
export default function ChatInterface({
  messages,
  typingUsers,
  currentUser,
  inputValue,
  setInputValue,
  onSendMessage,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enterキーが押され、Shiftキーが押されていない場合にメッセージを送信
    // IME（日本語）入力中はEnterキーを無視する
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault(); // デフォルトの改行動作をキャンセル
      onSendMessage();
    }
  };

  useEffect(() => {
    // 新しいメッセージが追加された際や、タイピング中のユーザーがいる場合に、自動的にスクロール
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typingUsers]);

  return (
    <div className="flex flex-col h-full">
      {/* チャットメッセージ表示エリア */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full absolute inset-0 p-4">
          <div className="space-y-4 pb-2">
            {messages.map((message) => (
              <div key={message.id} className="chat-message">
                {/* システムメッセージとユーザーメッセージで表示を分岐 */}
                {message.type === "system" ? (
                  // システムメッセージ：中央揃えで表示
                  <div className="flex justify-center">
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full">
                      {message.content}
                    </span>
                  </div>
                ) : (
                  // ユーザーメッセージ：送信者によって左右に寄せて表示
                  <div
                    className={`flex gap-2 ${
                      message.sender === currentUser
                        ? "justify-end" // ログインユーザーのメッセージは右寄せ
                        : "justify-start" // 他のユーザーのメッセージは左寄せ
                    }`}
                  >
                    {message.sender !== currentUser && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${message.sender}`}
                        />
                        <AvatarFallback>
                          {message.sender?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[80%] ${
                        message.sender === currentUser ? "order-first" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {message.sender !== currentUser && (
                          <span className="text-sm font-medium">
                            {message.sender}
                          </span>
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDistanceToNow(new Date(message.timestamp), {
                            addSuffix: true,
                            locale: ja,
                          })}
                        </span>
                      </div>
                      <div
                        className={`p-3 rounded-lg ${
                          message.sender === currentUser
                            ? "bg-blue-600 text-white ml-auto"
                            : "bg-white dark:bg-slate-800 border dark:border-slate-700"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                    {message.sender === currentUser && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${message.sender}`}
                        />
                        <AvatarFallback>
                          {message.sender.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* タイピング中のユーザーがいる場合にインジケーターを表示 */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${typingUsers[0]}`}
                  />
                  <AvatarFallback>{typingUsers[0].charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-3 rounded-lg">
                  <div className="flex gap-1">
                    <span className="animate-bounce">•</span>
                    <span
                      className="animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    >
                      •
                    </span>
                    <span
                      className="animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    >
                      •
                    </span>
                  </div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {typingUsers.join(", ")}{" "}
                  {typingUsers.length === 1 ? "is" : "are"} typing...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* メッセージ入力エリア */}
      <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを追加..."
            className="bg-white dark:bg-slate-900"
          />
          <Button
            onClick={onSendMessage}
            disabled={!inputValue.trim()}
            className="bg-blue-700 hover:bg-blue-800"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
