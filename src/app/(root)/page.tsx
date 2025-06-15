import WelcomeScreen from "@/app/(root)/_components/welcome-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oga Space",
  description: "重力級のつながり、チャットを超えるリアル体験。",
};

export default function Home() {
  return (
    <main>
      <WelcomeScreen />
    </main>
  );
}
