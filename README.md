# ⚾ WISE Vision Training App

野球選手のための**ビジョントレーニングWebアプリ** — PHASE 1 MVP

> KVA動体視力・眼と手の協応・瞬間視を、ゲーム感覚で毎日3分鍛える。

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://typescriptlang.org)

---

## 📋 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [機能一覧](#機能一覧)
3. [技術スタック](#技術スタック)
4. [ディレクトリ構成](#ディレクトリ構成)
5. [環境構築](#環境構築)
6. [Supabaseセットアップ](#supabaseセットアップ)
7. [Vercelデプロイ](#vercelデプロイ)
8. [ゲームモジュール仕様](#ゲームモジュール仕様)
9. [開発ロードマップ](#開発ロードマップ)

---

## プロジェクト概要

**WISE Baseball Academy Online** が提供するビジョントレーニングWebアプリ。

| 項目 | 内容 |
|------|------|
| 対象ユーザー | 小学生〜高校生（野球選手）・コーチ・保護者 |
| 対応デバイス | iPad（9.7〜13インチ）/ タッチパネルモニター（21〜42インチ）/ PC |
| デプロイ先 | Vercel（Edge Network） |
| バックエンド | Supabase（Auth + PostgreSQL） |
| 現在フェーズ | **PHASE 1 MVP** |

### 科学的根拠

- 人間の外界情報収集の **80〜87%** を視覚が担う
- 順天堂大学研究（2023年）：視覚トレーニングは実打撃と同等以上の視機能向上効果
- スポーツビジョンの発達黄金期は **7〜10歳**、ピークは20歳
- ターゲット年代（小〜高校生）は最も効果が出やすい時期

---

## 機能一覧

### ✅ PHASE 1 実装済み

#### 認証
- メールアドレス + パスワードによる新規登録（2ステップ）
- ログイン / ログアウト
- 未認証ユーザーの自動リダイレクト（middleware保護）
- プロフィール設定（表示名・守備位置・学年・チーム名）

#### ゲームモジュール（2本）
- **① ピッチャーリアクション** — KVA動体視力 + 眼と手の協応
- **⑤ ボールナンバーハント** — KVA動体視力 + 瞬間視

#### ダッシュボード
- 累計スコア・総セッション数・平均正確率・最速反応時間の表示
- プレイ履歴（直近5件）
- ゲームカード（ベストスコア表示）

#### データ保存
- セッション結果のSupabase保存（スコア・正確率・平均反応時間・難易度）
- Row Level Security（ユーザーは自分のデータのみアクセス可）

---

## 技術スタック

| カテゴリ | 技術 | 用途 |
|----------|------|------|
| フレームワーク | Next.js 14 (App Router) | SSR・ルーティング |
| 言語 | TypeScript 5 | 型安全な開発 |
| スタイリング | Tailwind CSS 3 | レスポンシブUI |
| アニメーション | Framer Motion 11 | ゲームエフェクト・画面遷移 |
| 描画 | CSS + SVG | ボール軌道・フィールド表現 |
| 認証・DB | Supabase (@supabase/ssr) | Auth + PostgreSQL |
| デプロイ | Vercel | Edge Deploy・CI/CD |
| 反応計測 | `performance.now()` + `requestAnimationFrame` | ミリ秒精度の計測 |

---

## ディレクトリ構成

```
wise-vision-app/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx          # ログインページ
│   │   │   └── signup/page.tsx         # 新規登録（2ステップ）
│   │   ├── dashboard/
│   │   │   ├── page.tsx                # ダッシュボード（Server Component）
│   │   │   └── DashboardClient.tsx     # 統計表示（Client Component）
│   │   ├── games/
│   │   │   ├── pitcher-reaction/page.tsx   # ゲーム①ページ
│   │   │   └── ball-number-hunt/page.tsx   # ゲーム⑤ページ
│   │   ├── globals.css                 # グローバルスタイル
│   │   ├── layout.tsx                  # ルートレイアウト
│   │   └── page.tsx                    # ランディングページ
│   ├── components/
│   │   ├── games/
│   │   │   ├── PitcherReactionGame.tsx # ゲーム①コンポーネント
│   │   │   └── BallNumberHuntGame.tsx  # ゲーム⑤コンポーネント
│   │   ├── layout/
│   │   │   ├── Header.tsx              # ヘッダー（ログアウト含む）
│   │   │   └── Navigation.tsx          # ナビゲーション
│   │   └── ui/
│   │       ├── GameCard.tsx            # ゲーム選択カード
│   │       └── ScoreDisplay.tsx        # スコア表示
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts               # ブラウザ用Supabaseクライアント
│   │       ├── server.ts               # サーバー用Supabaseクライアント
│   │       └── middleware.ts           # セッション更新ミドルウェア
│   └── types/
│       ├── index.ts                    # アプリ共通型定義
│       └── database.ts                 # Supabase DB型定義
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql      # 初期スキーマ（profiles・game_sessions）
├── middleware.ts                       # Next.js ルート保護
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 環境構築

```bash
# 1. クローン
git clone https://github.com/winniek75/baseball-vison.training.git
cd baseball-vison.training

# 2. 依存インストール
npm install

# 3. 環境変数設定
cp .env.local.example .env.local
# .env.local を編集（下記参照）

# 4. 開発サーバー起動
npm run dev
# → http://localhost:3000
```

### 環境変数（`.env.local`）

```env
NEXT_PUBLIC_SUPABASE_URL=https://kavnfuywwebkjscdhtmy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## Supabaseセットアップ

Supabase Dashboard → **SQL Editor** に以下を貼り付けて実行：

```sql
-- supabase/migrations/001_initial_schema.sql の内容をそのまま実行
```

作成されるテーブル：

| テーブル | 内容 |
|----------|------|
| `profiles` | ユーザープロフィール（表示名・守備位置・学年・チーム名・ロール） |
| `game_sessions` | ゲーム結果（スコア・正確率・平均反応時間・難易度・ラウンド数） |

RLSポリシー：ユーザーは自分のデータのみ読み書き可。コーチロールは全データ閲覧可。

---

## Vercelデプロイ

1. Vercel Dashboard → **New Project** → GitHubリポジトリをインポート
2. **Root Directory は空白**（変更しない）
3. Environment Variables を追加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy**

---

## ゲームモジュール仕様

### ① ピッチャーリアクション

| 項目 | 内容 |
|------|------|
| 訓練要素 | KVA動体視力（前後）+ 眼と手の協応 |
| 対象ポジション | バッター全般 |
| ゲーム時間 | 45〜60秒 |
| 難易度 | 5段階 |
| 計測値 | 反応時間（ms）・正確率・スコア |

**ゲームメカニクス：**
- 画面奥から投球が迫ってくるアニメーション（CSS perspective）
- 球種：直球・カーブ・スライダー・チェンジアップ・フェイク
- ストライク球 → タップ ✅ / ボール球・フェイク → タップしない
- 反応時間で PERFECT（<300ms）/ GREAT（<500ms）/ OK を判定
- コンボボーナス（3連続ごとに倍率UP）

**難易度変化：**

| Lv | 球速 | フェイク率 | 数字読み |
|----|------|------------|----------|
| 1 | 1800ms | 0% | なし |
| 2 | 1500ms | 10% | なし |
| 3 | 1200ms | 15% | なし |
| 4 | 1000ms | 20% | あり |
| 5 | 800ms | 25% | あり |

---

### ⑤ ボールナンバーハント

| 項目 | 内容 |
|------|------|
| 訓練要素 | KVA動体視力 + 瞬間視（情報の瞬間記憶） |
| 対象ポジション | バッター全般 |
| ゲーム形式 | 全N ラウンド制 |
| 難易度 | 5段階 |
| 計測値 | 正確率・反応時間（ms）・スコア |

**ゲームメカニクス：**
- ボールが手前に飛んでくる → 一定時間だけ数字が表示される → 消える
- テンキーで数字を入力して正誤判定
- 1桁（Lv1〜3）/ 2桁（Lv4〜5）
- 速く答えるほど高得点（反応時間ボーナス）

**難易度変化：**

| Lv | 表示時間 | ラウンド数 | 桁数 |
|----|----------|------------|------|
| 1 | 1000ms | 15 | 1桁 |
| 2 | 700ms | 18 | 1桁 |
| 3 | 500ms | 20 | 1桁 |
| 4 | 350ms | 22 | 2桁 |
| 5 | 200ms | 25 | 2桁 |

---

## 開発ロードマップ

```
✅ PHASE 1 — MVP（現在）
   ├── 認証システム（登録・ログイン）
   ├── ゲーム① ピッチャーリアクション
   ├── ゲーム⑤ ボールナンバーハント
   ├── スコア保存・ダッシュボード
   └── Vercel デプロイ

🔲 PHASE 2 — 全7モジュール + ゲーミフィケーション
   ├── ゲーム② フライトレーサー（DVA動体視力）
   ├── ゲーム③ フラッシュサイン（瞬間視）
   ├── ゲーム④ スタジアムビジョン（周辺視野・大画面特化）
   ├── ゲーム⑥ インフィールドリアクション（DVA動体視力）
   ├── ゲーム⑦ ランナーウォッチ（周辺視野 + 認知判断）
   ├── XP・レベル・バッジシステム
   ├── 視機能レーダーチャート（ビジョンプロフィールカード）
   ├── デイリーミッション・ストリーク
   └── チーム内ランキング

🔲 PHASE 3 — コーチ機能 + 対戦
   ├── コーチ管理画面（選手一覧・成長データ）
   ├── 週次レポート自動生成（PDF）
   ├── リアルタイム対戦モード（マルチタッチ）
   ├── 眼ウォームアッププログラム
   └── LINE連携

🔲 PHASE 4 — スケール
   ├── 全国リーダーボード（年代別）
   ├── AI弱点自動診断・パーソナライズ
   └── 他スポーツへの展開
```

---

## ライセンス

WISE Baseball Academy Online — All rights reserved.
