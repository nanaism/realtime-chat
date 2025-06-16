import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"], // 'latin' は必須に近い
  weight: ["400", "700"], // 必要なウェイトを指定
  variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
  title: "Oga Space",
  description: "オンライン上でチャットしよう！✨️",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={notoSansJp.variable}>
      <body className={` antialiased`}>{children}</body>
    </html>
  );
}
