"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// 認証チェック中に表示するシンプルなローディングコンポーネント
// ちらつきを防ぐため、背景色などをページのテーマと合わせると良い
const AuthGuardLoading = () => (
  <div className="fixed inset-0 w-full h-screen bg-black" />
);

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username) {
      // ユーザー名がない場合、トップページにリダイレクト
      // router.replaceを使うとブラウザ履歴に/chatが残らないため、ユーザーが「戻る」ボタンでループに陥るのを防げる
      router.replace("/");
    } else {
      // ユーザー名がある場合、ページの表示を許可
      setIsAuthorized(true);
    }
  }, [router]);

  // 認証チェックが完了するまではローディング画面を表示
  if (!isAuthorized) {
    return <AuthGuardLoading />;
  }

  // 認証済みなら子ページ (page.tsx) を表示
  return <>{children}</>;
}
