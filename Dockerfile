# Dockerfile (修正後)

# --- 1. ビルドステージ ---
FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install --frozen-lockfile
RUN npm run build

# --- 2. 本番ステージ ---
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# ビルドステージから必要なファイルをコピー
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# package-lock.jsonもコピーすると、より安定したインストールになります
COPY --from=builder /app/package-lock.json ./package-lock.json

# standaloneモードで生成されたファイルをコピー
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# カスタムサーバーファイルをコピー (例: server.js)
COPY --from=builder /app/server.js ./server.js

# ★★★ ここにコマンドを追加 ★★★
# 本番環境で必要なパッケージ (socket.io など) をインストールします
RUN npm install --omit=dev

# App EngineがPORT環境変数を設定します (通常は8080)
EXPOSE 8080

# アプリケーションを起動するコマンド
CMD ["node", "server.js"]