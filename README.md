# Oga Space - 3D Visual Chat Application

[![Deploy on chat.aiichiro.jp](https://img.shields.io/badge/Live%20Demo-chat.aiichiro.jp-purple?style=for-the-badge&logo=vercel)](https://chat.aiichiro.jp/)

リアルタイムチャットと3D空間が融合した、新感覚のコミュニケーションスペースです。
テキストだけのやり取りを超え、ユーザーの「存在」を視覚的に感じられるインタラクティブな体験を提供します。

**👇 今すぐサイトを体験！**
### [https://chat.aiichiro.jp/](https://chat.aiichiro.jp/)

![Oga Spaceのスクリーンショット](https://github.com/user-attachments/assets/c5c633d2-989a-4cec-8c26-0e8d43a9564a)

---

## 🌟 プロジェクトの特徴 (Features)

このアプリケーションは、最新のWeb技術を駆使して、リッチなリアルタイムコミュニケーションを実現しています。

-   **🌐 リアルタイム・チャット機能**
    -   **WebSocket (Socket.IO)** を利用した、低遅延で双方向のメッセージ送受信。
    -   ユーザーの参加・退出通知や、「入力中...」インジケーターといった、きめ細やかなフィードバック。
    -   従来のチャットに加え、現在接続中のユーザーを一覧で確認できるタブも実装。

-   **🎨 インタラクティブな3Dビジュアルマップ**
    -   **React Three Fiber (Three.js)** を活用し、チャット画面の横にインタラクティブな3D空間を構築。
    -   オンラインのユーザーがアバターとしてマップ上に表示され、誰が参加しているかを視覚的に把握できます。
    -   自分のアバターは**ドラッグ＆ドロップで自由に移動**させることができ、その位置情報は他のユーザーにもリアルタイムで同期されます。

-   **👤 シームレスな参加体験**
    -   複雑な登録は不要。ユーザー名を入力するだけで、すぐにチャットと3D空間に参加できます。

-   **✨ 洗練されたUIデザイン**
    -   モダンでアクセシビリティの高いUIコンポーネントライブラリ **shadcn/ui** を採用し、直感的で美しいインターフェースを実現しています。

## 💡 こだわりのポイント： 設計思想

### 「存在感」を伝えるコミュニケーション

このプロジェクトの核となるアイデアは、**テキストによるコミュニケーション**と**空間的な存在感の表現**を融合させることです。

従来のチャットアプリでは、相手がオンラインかどうかは分かっても、その「気配」を感じることは困難でした。
`Oga Space` では、3Dマップ上にユーザーをアバターとして表示し、その位置情報を共有することで、同じ空間に誰かが「いる」という感覚を生み出します。

これにより、ただメッセージを交換するだけでなく、より豊かで没入感のあるコミュニケーション体験の創出を目指しました。

## 🛠️ 使用技術 (Tech Stack)

このアプリケーションは、以下の技術スタックで構築されています。

-   **Frontend**: **Next.js**, **React**, **TypeScript**
-   **3D Graphics**: **React Three Fiber (Three.js)**
-   **Realtime Communication**: **Socket.IO**, **WebSocket**
-   **Database**: **Firebase Realtime Database** (ユーザーの位置情報同期など)
-   **UI Components**: **shadcn/ui**
-   **Deployment**: Vercel

## 🚀 ローカルでの実行方法 (Getting Started)

このプロジェクトをご自身の環境で動かす場合は、以下の手順に従ってください。

1.  **リポジトリをクローン**
    ```sh
    git clone https://github.com/your-username/your-repository.git
    ```
2.  **ディレクトリに移動**
    ```sh
    cd your-repository
    ```
3.  **依存関係をインストール**
    ```sh
    npm install
    # または yarn install
    ```4.  **環境変数を設定**
    `.env.local.example` を参考に `.env.local` ファイルを作成し、FirebaseのAPIキーなどを設定してください。
    
5.  **開発サーバーを起動**
    ```sh
    npm run dev
    # または yarn dev
    ```
    ブラウザで `http://localhost:3000` を開いてください。
