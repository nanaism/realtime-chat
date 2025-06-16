"use client"; // このコンポーнентをクライアントコンポーネントとしてマークします

import dynamic from "next/dynamic";

// WelcomeScreenコンポーネントを動的にインポートし、SSRを無効化します。
const WelcomeScreen = dynamic(() => import("./welcome-screen"), {
  ssr: false,
  // コンポーネントが読み込まれるまでの間に表示するUI
  loading: () => <div className="min-h-screen w-full bg-slate-900" />,
});

export default function DynamicWelcomeScreen() {
  // 動的に読み込んだWelcomeScreenを返すだけのシンプルなコンポーネント
  return <WelcomeScreen />;
}
