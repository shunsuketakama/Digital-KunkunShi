# ローカル起動手順

## 1. 依存インストール

```bash
npm install
```

## 2. 環境変数

```bash
cp .env.example .env.local
```

`SUPABASE_SERVICE_ROLE_KEY` はブラウザ側で参照しないよう、API Route / worker のみで使用してください。

## 3. Supabase マイグレーション適用

```bash
supabase db push
```

## 4. フロント起動

```bash
npm run dev
```

## 5. worker 起動（別ターミナル）

```bash
npm run worker:dev
```

# Cloud Run デプロイ手順

```bash
gcloud builds submit --tag gcr.io/$GOOGLE_CLOUD_PROJECT/digital-kunkunshi-worker -f worker/Dockerfile

gcloud run deploy digital-kunkunshi-worker \
  --image gcr.io/$GOOGLE_CLOUD_PROJECT/digital-kunkunshi-worker \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars SUPABASE_URL=$SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
```

Cloud Tasks を使う場合は、Next.js 側に `CLOUD_TASKS_CREATE_URL` と `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL` を設定してください。

# 動作確認（最低限）

1. ホーム画面で `mp3/wav` をアップロードして送信。
2. 曲詳細画面で「解析を開始」を押下。
3. `queued -> processing -> done` へ遷移することを確認。
4. 工工四と音名が表示され、テキストエクスポート欄に結果が出ることを確認。
