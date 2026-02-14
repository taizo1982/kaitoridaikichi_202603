---
name: lp-build
description: LP本番ビルド。画像最適化、タグ注入、minifyを実行。ビルドして、公開準備して、と言われたら使用。
allowed-tools: Bash, Read
---

# LP本番ビルドスキル

src/ の内容を最適化して build/ に出力します。

## ビルドプロセス

```bash
npm run build
```

### 実行内容

1. **画像最適化**
   - PNG/JPG → AVIF/WebP に変換
   - 元画像はフォールバックとして保持

2. **HTML最適化**
   - `<img>` → `<picture>` に変換
   - OGP/metaタグを注入（.envから）
   - 広告タグを注入（.envから）
   - HTML minify

3. **CSS最適化**
   - minify
   - style.css → style.min.css

4. **JS最適化**
   - コンバージョン追跡コードを注入
   - minify
   - script.js → script.min.js

## 事前確認

ビルド前に以下を確認：

```bash
# 品質チェック
npm run check:all

# .env 設定確認
cat .env
```

## 出力ファイル

```
build/
├── index.html        # 最適化済みHTML
├── style.min.css     # minified CSS
├── script.min.js     # minified JS + コンバージョンコード
└── images/
    ├── *.avif        # AVIF形式
    ├── *.webp        # WebP形式
    └── *.png/*.jpg   # フォールバック
```

## 画像最適化の詳細

```bash
# 画像のみ最適化（ビルド前に実行可能）
npm run optimize:images
```

| 入力 | 出力 | 品質 |
|-----|------|-----|
| .png | .avif | 60 |
| .png | .webp | 80 |
| .jpg | .avif | 60 |
| .jpg | .webp | 80 |

## プレビュー

```bash
# ビルド結果をプレビュー
npm run preview
```

http://localhost:3000 で確認

## 本番確認

```bash
# PageSpeed等の検証
npm run validate
```

## デプロイ

build/ フォルダの内容をデプロイ：

- **Netlify**: `netlify deploy --prod --dir=build`
- **Vercel**: `vercel --prod build`
- **S3**: `aws s3 sync build/ s3://bucket-name/`
- **FTP**: build/ の中身をアップロード

## トラブルシューティング

### 画像最適化が失敗する
```bash
# sharp を再インストール
npm install sharp
```

### OGPタグが入らない
```bash
# .env ファイルを確認
cat .env | grep -E "^(SITE_|OG_)"
```

### コンバージョンコードが入らない
```bash
# 広告IDを確認
cat .env | grep -E "^(GA_|META_|LINE_|YAHOO_)"
```
