---
name: lp-validate
description: 本番公開前の最終検証。ビルド後のファイルを確認。検証して、最終確認して、と言われたら使用。
allowed-tools: Bash, Read, WebFetch
---

# LP最終検証スキル

build/ のファイルを検証し、本番公開前の最終確認を行います。

## 検証項目

### 1. ファイル確認

```bash
# build/ の内容確認
ls -la build/

# ファイルサイズ確認
du -sh build/*
```

### 2. HTML検証

```bash
# OGPタグの確認
grep -A 20 "og:" build/index.html

# 広告タグの確認
grep -E "(gtag|fbq|_lt|ytag)" build/index.html

# picture タグの確認
grep -c "<picture>" build/index.html
```

### 3. コンバージョンコード確認

```bash
# data-cv イベントハンドラーの確認
grep "data-cv" build/script.min.js
```

## 手動確認チェックリスト

### 表示確認
- [ ] PC表示（1280px）が正常
- [ ] タブレット表示（768px）が正常
- [ ] モバイル表示（375px）が正常
- [ ] 孤立文字がない

### 機能確認
- [ ] 全リンクが動作する
- [ ] CTAボタンが動作する
- [ ] スムーズスクロールが動作する
- [ ] FAQアコーディオンが動作する

### SEO確認
- [ ] `<title>` が正しい
- [ ] `<meta description>` が正しい
- [ ] OGP画像が正しく表示される
- [ ] Twitter Cardが正しく表示される

### 広告確認
- [ ] Google Tag Assistant でタグを確認
- [ ] Meta Pixel Helper でPixelを確認
- [ ] 各管理画面でイベントを確認

## OGP プレビューツール

以下のツールでOGPを確認：

- **Facebook**: https://developers.facebook.com/tools/debug/
- **Twitter**: https://cards-dev.twitter.com/validator
- **LINE**: https://poker.line.naver.jp/

## PageSpeed確認

デプロイ後、以下で確認：

```
https://pagespeed.web.dev/
```

目標スコア：
- モバイル: 90以上
- デスクトップ: 95以上

## Core Web Vitals

| 指標 | 目標値 |
|-----|-------|
| LCP | 2.5秒以下 |
| FID | 100ms以下 |
| CLS | 0.1以下 |

## 問題があった場合

1. 問題を特定
2. src/ のファイルを修正
3. 再度 `/lp-build` を実行
4. 再検証

## 完了後

全て問題なければ：
- build/ フォルダをデプロイ
- 本番URLで最終確認
- 広告管理画面でコンバージョン確認
