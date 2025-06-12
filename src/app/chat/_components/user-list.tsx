"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User } from "@/lib/types";

interface UserListProps {
  users: User[];
  typingUsers: string[];
}

/**
 * オンラインユーザーリストを表示するコンポーネント
 */
export default function UserList({ users, typingUsers }: UserListProps) {
  return (
    <div className="h-full bg-white dark:bg-slate-900 flex flex-col">
      <div className="p-4 border-b dark:border-slate-800">
        {/* 現在オンラインのユーザー数を表示 */}
        <h3 className="text-sm font-medium">
          オンラインユーザー ({users.length})
        </h3>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} />
                  {/* アバター画像がない場合は、ユーザー名の頭文字と背景色でフォールバック表示 */}
                  <AvatarFallback style={{ backgroundColor: user.color }}>
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {/* ユーザーのステータス（オンラインまたはタイピング中）を示すインジケーター */}
                <span
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                    typingUsers.includes(user.name)
                      ? "bg-amber-500" // タイピング中はオレンジ色
                      : "bg-emerald-500" // オンライン状態は緑色
                  }`}
                ></span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.name}</span>
                {/* ユーザーがタイピング中の場合に "typing..." を表示 */}
                {typingUsers.includes(user.name) && (
                  <span className="text-xs text-amber-500 dark:text-amber-400">
                    typing...
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* オンラインユーザーがいない場合にメッセージを表示 */}
          {users.length === 0 && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <p>No users online</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
