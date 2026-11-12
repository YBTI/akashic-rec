# Akashic REC(アカシックレコード)

あなたを救ってくれた存在(神様・聖霊様・御心・先生)との経験を、AIインタビューで深掘りして記事として残すWebサービスです。

- Next.js(App Router)+ TypeScript
- Supabase(Googleログイン・データベース・画像保存)
- AI:Vercel AI SDK(テストは Gemini 無料枠、本番は Claude:質問 Haiku/記事化 Sonnet)
- 音声モード:ブラウザ標準の音声認識・読み上げ(追加費用なし)

---

## セットアップ手順

### 1. Supabase
1. https://supabase.com でプロジェクトを作成
2. **SQL Editor** で `supabase/schema.sql` の中身を貼り付けて実行(表・権限・画像保存場所が作られます)
3. **Project Settings > API** で `Project URL` と `anon public` キーを控える

### 2. Googleログイン
1. Google Cloud Console で「OAuth 同意画面」を設定
2. 「認証情報 > OAuth クライアント ID」を作成(種類:ウェブアプリケーション)
   - 承認済みのリダイレクト URI:`https://<SupabaseのプロジェクトID>.supabase.co/auth/v1/callback`
3. Supabase の **Authentication > Sign In / Providers > Google** を有効にし、クライアントIDとシークレットを入力
4. Supabase の **Authentication > URL Configuration**
   - Site URL:公開URL(例 `https://akashic-rec.vercel.app`)
   - Redirect URLs:`http://localhost:3000/**` と `https://<公開URL>/**`

### 3. AIのAPIキー
- テスト:Google AI Studio で Gemini の APIキーを発行
- 本番:Anthropic Console で APIキーを発行し、利用上限(Spend limit)を設定

### 4. ローカルで動かす
```bash
cp .env.example .env.local   # 値を入力
npm install
npm run dev                   # http://localhost:3000
```

### 5. 公開(Vercel)
1. このリポジトリを GitHub に push
2. Vercel で「Import Project」→ リポジトリを選択
3. **Environment Variables** に `.env.example` の項目をすべて登録
4. Deploy

### 本番で Claude に切り替える
Vercel の環境変数を変更して再デプロイするだけです。
```
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```
モデル名は `ANTHROPIC_QUESTION_MODEL` / `ANTHROPIC_ARTICLE_MODEL` で変更できます。最新のモデル名は https://docs.claude.com で確認してください。

---

## フォルダ構成
```
app/
  page.tsx               トップ(記録一覧・対象で絞り込み)
  posts/[id]/            記事ページ(目次・画像・太字・リンク)
  write/                 新しい記録(タイトル・対象)
  interview/[id]/        AIインタビュー(テキスト/音声)
  editor/[id]/           note風エディタ
  me/                    マイページ(下書き・公開記事)
  login/                 Googleログイン
  api/interview/         質問を生成(ストリーミング)
  api/article/           インタビューを記事に整形
components/              画面部品
lib/
  ai.ts                  AIの切り替え(Gemini / Claude)
  prompts.ts             インタビュー・記事化の指示文
  guard.ts               ログイン確認・入力チェック・利用回数制限
supabase/schema.sql      データベース定義
```

## 安全のための仕組み
- APIキーはサーバー側だけで使用(ブラウザには出ません)
- 記事は本人だけが編集・削除でき、下書きとインタビュー記録は本人しか読めません(RLS)
- AIの利用は1人1日 `AI_DAILY_LIMIT` 回まで
- `.env.local` は `.gitignore` 済みなので GitHub には上がりません

## 公開前にやること
- 利用規約・プライバシーポリシーのページを追加(信仰や個人の経験を扱い、内容をAIに送る旨を明記)
- 不適切な投稿の通報・削除の運用を決める
- Gemini 無料枠は送信内容がサービス改善に使われる場合があるため、一般公開時は本番(有料)設定に切り替える
