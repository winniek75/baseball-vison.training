# ⚾ WISE Vision Training App

野球選手のためのビジョントレーニングゲームアプリ — PHASE 1 MVP

## 技術スタック

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + カスタムデザイントークン
- **Framer Motion** — アニメーション・エフェクト
- **Canvas API** — ボール軌道描画
- **Supabase** — Auth + PostgreSQL DB
- **Recharts** — グラフ可視化
- **Zustand** — ゲームステート管理
- **Vercel** — デプロイ

---

## ディレクトリ構成

```
app/
  (auth)/login/        ← ログインページ
  (auth)/signup/       ← サインアップページ
  dashboard/           ← メインダッシュボード
  game/pitcher-reaction/   ← ゲーム①
  game/ball-number-hunt/   ← ゲーム⑤
  api/sessions/        ← セッションAPI
  layout.tsx           ← ルートレイアウト
  globals.css          ← グローバルスタイル

components/
  games/PitcherReaction/
    index.tsx           ← Canvas ゲームロジック
    GameHUD.tsx         ← スコア・タイマーHUD
    GameResultOverlay.tsx  ← 結果オーバーレイ
    GameSetupScreen.tsx    ← 設定画面
  games/BallNumberHunt/
    index.tsx           ← Canvas + 4択UIゲームロジック

lib/
  supabase.ts          ← Supabaseクライアント
  scoring.ts           ← スコアリング・バッジ・難易度設定

store/
  gameStore.ts         ← Zustand ゲームステート

types/
  supabase.ts          ← TypeScript型定義

supabase/migrations/
  001_initial.sql      ← DBスキーマ

middleware.ts          ← Auth ルート保護
```

---

## セットアップ手順

### 1. Supabase プロジェクト作成

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. SQL Editor で `supabase/migrations/001_initial.sql` を実行
3. Project URL と anon key を取得

### 2. 環境変数設定

`.env.local.example` をコピーして `.env.local` を作成:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. 依存関係インストール

```bash
npm install
```

### 4. 開発サーバー起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く。

### 5. Vercel デプロイ

```bash
# Vercel CLI使用
npx vercel

# または GitHub連携でCI/CD自動デプロイ
```

Vercel環境変数にも `.env.local` と同じ値を設定すること。

---

## 実装済み機能 (PHASE 1)

### ゲームモジュール

#### ① ピッチャーリアクション
- Canvas API でマウンドから手前に飛ぶボールをアニメーション
- 球種: 直球 / スライダー / カーブ / チェンジアップ（軌道パターン別）
- ストライクゾーン表示・ヒット判定
- `performance.now()` + `pointerdown` でミリ秒計測
- 難易度5段階（球速・フェイク率・判定窓）
- プレイ時間: 30秒 / 60秒 / 90秒

#### ⑤ ボールナンバーハント
- 回転しながら飛んでくるボールに数字を描画
- 数字を読み取って4択から回答
- 難易度で数字範囲・回転速度変化

### ダッシュボード
- 直近7日スコア折れ線グラフ (Recharts)
- 視機能レーダーチャート (6要素)
- 連続ログイン日数ストリーク
- デイリーミッション
- 獲得バッジ一覧
- 統計サマリー (総プレイ数・平均反応速度・最高スコア)

### 認証
- Supabase Email認証
- 選手 / コーチ ロール
- middleware.ts で未認証ルート保護

### データ保存
- 全セッション → Supabase `sessions` テーブル
- バッジ自動付与
- 連続ログイン日数 (trigger で自動更新)

---

## iPad / タッチパネルモニター対応

- `touch-action: manipulation` — iOS 300ms タップ遅延を排除
- `pointerdown` イベント優先
- `devicePixelRatio` 考慮のCanvas HiDPI対応
- タップターゲット: iPad 44px+ / 大型モニター 60px+
- 画面サイズ検知で `isScreenLarge` フラグ管理

---

## PHASE 2 以降 (予定)

- フライトレーサー (DVA動体視力)
- フラッシュサイン (瞬間視)
- スタジアムビジョン (周辺視野・大型モニター特化)
- インフィールドリアクション (DVA左右)
- ランナーウォッチ (周辺視野+認知判断)
- コーチ管理画面
- 週次レポート PDF出力
- リアルタイム対戦モード

---

## 参考資料

- 企画書: `baseball_vision_training_analysis.html`
- 順天堂大学研究 (2023): 視覚的トレーニングの効果検証
- スポーツビジョン6要素: KVA・DVA・眼と手の協応・瞬間視・深視力・周辺視野
