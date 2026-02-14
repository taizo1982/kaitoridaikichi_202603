---
name: lp-ads
description: 広告タグとコンバージョン設定。GA4、Google Ads、Meta Pixel、LINE Tag、Yahoo Tag、Microsoft Clarity対応。広告設定して、タグを入れて、と言われたら使用。
allowed-tools: Read, Write, Edit
---

# 広告タグ設定スキル

.env ファイルに広告タグIDを設定し、コンバージョン追跡を有効にします。

## 対応プラットフォーム

| プラットフォーム | 環境変数 | 取得場所 |
|-----------------|---------|---------|
| Google Analytics 4 | GA_MEASUREMENT_ID | GA4 管理画面 → データストリーム |
| Google Ads | GA_ADS_ID, GA_ADS_CONVERSION_LABEL | Google Ads → ツール → コンバージョン |
| Meta Pixel | META_PIXEL_ID | Meta Events Manager |
| LINE Tag | LINE_TAG_ID | LINE Ads → タグ管理 |
| Yahoo Tag | YAHOO_RETARGETING_ID, YAHOO_CONVERSION_ID | Yahoo広告 → ツール |
| Microsoft Clarity | CLARITY_PROJECT_ID | Clarity → Settings → Overview |

## ヒアリング項目

1. **使用する広告プラットフォーム**
   - [ ] Google Analytics 4
   - [ ] Google Ads
   - [ ] Meta (Facebook/Instagram)
   - [ ] LINE
   - [ ] Yahoo
   - [ ] Microsoft Clarity

2. **各プラットフォームのID**
   - 「管理画面のどこにありますか？」と聞かれたら場所を案内

3. **トラッキングオプション**
   - スクロール深度（25%, 50%, 75%, 90%）
   - 滞在時間（30秒, 60秒, 180秒）

## 設定ファイル

`.env` ファイルを作成/更新：

```bash
# Google Analytics 4
GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Google Ads
GA_ADS_ID=AW-XXXXXXXXXX
GA_ADS_CONVERSION_LABEL=XXXXXXXXXX

# Meta Pixel
META_PIXEL_ID=XXXXXXXXXXXXXXX

# LINE Tag
LINE_TAG_ID=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX

# Yahoo Tag
YAHOO_RETARGETING_ID=XXXXXXXXXX
YAHOO_CONVERSION_ID=XXXXXXXXXX
YAHOO_CONVERSION_LABEL=XXXXXXXXXX

# Microsoft Clarity
CLARITY_PROJECT_ID=XXXXXXXXXX

# トラッキング
TRACK_SCROLL_DEPTH=true
TRACK_TIME_ON_PAGE=30,60,180
```

## コンバージョン設定

src/index.html の CTA に data-cv 属性があることを確認：

```html
<!-- ボタンクリック -->
<a href="#form" data-cv="cta-click">申し込む</a>

<!-- 電話 -->
<a href="tel:090-0000-0000" data-cv="tel">電話する</a>

<!-- LINE -->
<a href="https://line.me/R/ti/p/xxx" data-cv="line">LINE追加</a>

<!-- フォーム送信 -->
<form data-cv="form-submit">
```

## ビルド時の動作

`npm run build` 実行時に自動で：

1. 各プラットフォームのタグをHTMLに注入
2. コンバージョンコードをJSに注入
3. PageView + クリックイベントを追跡

## 確認方法

ビルド後、以下で確認：

1. **Google Tag Assistant** - Chrome拡張でタグを確認
2. **Meta Pixel Helper** - Chrome拡張でPixelを確認
3. **実際に各管理画面でイベントを確認**

## 完了後

- `/lp-build` で本番ビルド
- ビルド後のファイルをデプロイ
