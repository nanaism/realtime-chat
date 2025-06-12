# Dockerfile

# --- 1. ビルドステージ ---
# Next.jsアプリをビルドするための環境
FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install --frozen-lockfile
RUN npm run build

# --- 2. 本番ステージ ---
# 実際にアプリケーションを実行する軽量な環境
FROM node:18-alpine AS runner
WORKDIR /app

# 環境変数を本番モードに設定
ENV NODE_ENV=production

# ビルドステージから必要なファイルをコピー
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# standaloneモードで生成されたファイルをコピー
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# カスタムサーバーファイルをコピー (例: server.js)
COPY --from=builder /app/server.js ./server.js

# App EngineがPORT環境変数を設定します (通常は8080)
EXPOSE 8080

# アプリケーションを起動するコマンド
# package.jsonのstartスクリプトが "node server.js" であることを想定
CMD ["node", "server.js"]