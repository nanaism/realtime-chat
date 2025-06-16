// 新しく作成したDynamicWelcomeScreenをインポートします
import DynamicWelcomeScreen from "@/app/(root)/_components/DynamicWelcomeScreen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oga Space",
  description: "重力級のつながり、チャットを超えるリアル体験。",
};

export default function Home() {
  return (
    <main>
      {/* 動的インポートのロジックを内包したコンポーネントを呼び出します */}
      <DynamicWelcomeScreen />
    </main>
  );
}
