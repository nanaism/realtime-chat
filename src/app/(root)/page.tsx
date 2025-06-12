import WelcomeScreen from "@/app/(root)/_components/welcome-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sakana Office",
  description: "オンライン上の作業スペースに参加しましょう🐟",
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
      <WelcomeScreen />
    </main>
  );
}
