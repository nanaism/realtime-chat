"use client";

import ChatInterface from "@/app/chat/_components/chat-interface";
import UserList from "@/app/chat/_components/user-list";
import VirtualSpace from "@/app/chat/_components/virtual-space";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { LogOut, MessageSquare, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useChatSocket } from "./_hooks/use-chat-socket";

export default function ChatPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");

  // まず、localStorageからユーザー名を取得し、なければログインページへリダイレクト
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (!storedUsername) {
      router.push("/");
    } else {
      setUsername(storedUsername);
    }
  }, [router]);

  // カスタムフックを使用してチャット機能を初期化
  const {
    users,
    messages,
    typingUsers,
    isSocketInitialized,
    sendMessage,
    sendTypingUpdate,
    sendUserMove,
    logout,
  } = useChatSocket({ username });

  /**
   * チャットメッセージをサーバーに送信する
   */
  const handleSendMessage = () => {
    if (!inputValue.trim() || !username) return;
    sendMessage(inputValue);
    setInputValue("");
  };

  /**
   * メッセージ入力フィールドの変更をハンドルし、タイピング状態をサーバーに通知する
   */
  const handleInputChange = (value: string) => {
    setInputValue(value);
    const isTyping = value.trim().length > 0;
    sendTypingUpdate(isTyping);
  };

  /**
   * ユーザーのアバターの位置情報をサーバーに送信する
   */
  const handleUserMove = (
    _userId: string,
    newPosition: { x: number; y: number }
  ) => {
    sendUserMove(newPosition);
  };

  /**
   * チャットルームからの退出処理
   */
  const handleLeave = () => {
    logout(); // Socketを切断

    localStorage.removeItem("username");

    // コンポーネントの状態をリセット
    setUsername(null);
    setInputValue("");
    setShowUserPanel(false);
    setActiveTab("chat");

    router.push("/");
  };

  /**
   * ユーザーパネルの表示/非表示を切り替える
   */
  const toggleUserPanel = () => {
    setShowUserPanel((prev) => !prev);
  };

  /**
   * 表示するタブ（チャット/ユーザーリスト）を切り替える
   */
  const switchTab = (tab: string) => {
    setActiveTab(tab);
  };

  if (!username || !isSocketInitialized) {
    // ユーザー名設定とSocket初期化が完了するまでローディング表示
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  const currentUser = username;

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="py-4 px-8 flex items-center justify-between border-b bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐟🐟</span>
          <h1 className="text-xl font-semibold">
            <Link href="/">Sakana Office</Link>
          </h1>
        </div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          {users.length} 人参加中
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:block md:w-1/2 lg:w-4/5 border-r dark:border-slate-800">
          <VirtualSpace
            users={users}
            currentUser={currentUser}
            onUserMove={handleUserMove}
            typingUsers={typingUsers}
          />
        </div>

        <div className="flex flex-col w-full md:w-1/2 lg:w-2/5">
          <div className="flex-1 overflow-hidden">
            <div className="hidden md:block h-full">
              <Tabs value={activeTab} className="h-full">
                <TabsContent value="chat" className="h-full m-0 p-0">
                  <ChatInterface
                    messages={messages}
                    typingUsers={typingUsers}
                    currentUser={currentUser}
                    inputValue={inputValue}
                    setInputValue={handleInputChange}
                    onSendMessage={handleSendMessage}
                  />
                </TabsContent>
                <TabsContent value="users" className="h-full m-0 p-0">
                  <UserList users={users} typingUsers={typingUsers} />
                </TabsContent>
              </Tabs>
            </div>

            <div className="md:hidden h-full">
              {/* モバイル表示: チャットインターフェースは常に表示 */}
              <ChatInterface
                messages={messages}
                typingUsers={typingUsers}
                currentUser={currentUser}
                inputValue={inputValue}
                setInputValue={handleInputChange}
                onSendMessage={handleSendMessage}
              />
            </div>
          </div>

          {/* モバイル用ユーザーリスト、toggleUserPanelで表示/非表示を切り替え */}
          <div
            className={`md:hidden border-t dark:border-slate-800 ${
              showUserPanel ? "block" : "hidden"
            }`}
          >
            <UserList users={users} typingUsers={typingUsers} />
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-200 dark:border-slate-800 py-4 px-8 bg-white dark:bg-slate-900 flex justify-between items-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          表示名： <span className="font-medium">{username}</span>
        </div>
        <div className="flex space-x-3">
          <div className="hidden md:flex space-x-2">
            <Button
              variant={activeTab === "chat" ? "default" : "outline"}
              size="sm"
              onClick={() => switchTab("chat")}
              className="flex items-center gap-2 px-3 py-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">チャット</span>
            </Button>
            <Button
              variant={activeTab === "users" ? "default" : "outline"}
              size="sm"
              onClick={() => switchTab("users")}
              className="flex items-center gap-2 px-3 py-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">
                参加人数 ({users.length})
              </span>
            </Button>
          </div>

          {/* モバイル表示用ユーザーパネルの切り替えボタン */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleUserPanel}
            className="flex items-center gap-2 px-3 py-2 md:hidden"
          >
            <Users className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLeave}
            className="flex items-center gap-2 px-3 py-2"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
