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
import { MessageSquare, Users, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";

export default function WelcomeScreen() {
  const [username, setUsername] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      // 今回は、ユーザー名をlocalStorageに保存して管理
      localStorage.setItem("username", username.trim());
      router.push("/chat");
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Sakana Office へようこそ！
        </CardTitle>
        <CardDescription className="text-center">
          オンライン上の作業スペースに参加
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* アプリケーションの主要機能アイコンと説明 */}
        <div className="flex justify-around py-6">
          <div className="flex flex-col w-1/3 items-center gap-2 text-blue-600 dark:text-blue-500">
            <Users className="h-8 w-8" />
            <span className="text-xs font-medium">参加者を視覚化</span>
          </div>
          <div className="flex flex-col w-1/3 items-center gap-2 text-blue-600 dark:text-blue-500">
            <MessageSquare className="h-8 w-8" />
            <span className="text-xs font-medium">リアルタイムチャット</span>
          </div>
          <div className="flex flex-col w-1/3 items-center gap-2 text-blue-600 dark:text-blue-500">
            <Zap className="h-8 w-8" />
            <span className="text-xs font-medium">即時更新</span>
          </div>
        </div>
        {/* ユーザー名入力フォーム */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="username">表示名：</Label>
            <Input
              id="username"
              placeholder="表示名を入力してください"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="bg-white dark:bg-blue-900"
            />
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
          onClick={handleSubmit}
          disabled={!username.trim()}
        >
          参加する
        </Button>
      </CardFooter>
    </Card>
  );
}
