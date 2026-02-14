---
name: lp-section
description: LPにセクションを追加。hero、pain、solution、testimonials、faq、cta等。セクションを追加して、と言われたら使用。
allowed-tools: Read, Edit, Write, Skill
---

# セクション追加スキル

既存のLPに新しいセクションを追加します。

**重要**: デザイン作成時は `/frontend-design` スキルを使用してください。

## 対応セクション

| セクション | 説明 | 用途 |
|-----------|------|------|
| hero | ヒーローセクション | メインビジュアル、キャッチコピー |
| pain | 課題・悩み | ターゲットの悩みを列挙 |
| solution | 解決策 | ステップ形式で解決方法を提示 |
| features | 特徴・強み | サービスの特徴を紹介 |
| testimonials | お客様の声 | 実績・信頼性 |
| faq | よくある質問 | 不安解消 |
| pricing | 料金 | 価格表 |
| offer | オファー | 限定特典、イベント詳細 |
| cta | CTA | 行動喚起 |
| about | 会社紹介 | 信頼性向上 |
| flow | 流れ | 申し込み〜利用までの流れ |
| comparison | 比較表 | 競合との差別化 |

## 使い方

1. 追加したいセクション名を指定
2. 必要な情報をヒアリング
3. **画像を使う場合は先に確認**（特にhero、testimonials）
   - Readツールで画像を読み込む
   - 人物写真なら顔の位置を確認
4. src/index.html に追加
5. src/style.css にスタイル追加

## セクションテンプレート例

### Pain（課題）セクション
```html
<section class="pain">
  <div class="container">
    <h2 class="section-title">こんなお悩みありませんか？</h2>
    <ul class="pain-list">
      <li class="pain-item">課題1</li>
      <li class="pain-item">課題2</li>
      <li class="pain-item">課題3</li>
    </ul>
  </div>
</section>
```

### Testimonials（お客様の声）セクション
```html
<section class="testimonials">
  <div class="container">
    <h2 class="section-title">お客様の声</h2>
    <div class="testimonial-list">
      <div class="testimonial">
        <p class="testimonial-text">「感想テキスト」</p>
        <p class="testimonial-author">30代 女性</p>
      </div>
    </div>
  </div>
</section>
```

### FAQ セクション
```html
<section class="faq">
  <div class="container">
    <h2 class="section-title">よくあるご質問</h2>
    <div class="faq-list">
      <details class="faq-item">
        <summary class="faq-question">質問1</summary>
        <p class="faq-answer">回答1</p>
      </details>
    </div>
  </div>
</section>
```

## 注意事項

- 既存のスタイルとの整合性を確認
- セクションの順序を考慮（ストーリー性）
- CTAボタンには data-cv 属性を付与
- `/frontend-design` 使用時は日本語ルールを渡す（下記参照）

## 日本語LP追加ルール

`/frontend-design` 呼び出し時、以下を追加指示として含める：

- **孤立文字回避**: 375pxで1-2文字だけ行末に残らない
- **行間**: line-height: 1.8〜2.0
- **文字間**: letter-spacing: 0.05em
- **フォント**: 游ゴシック、Noto Sans JP、ヒラギノ角ゴ
- **1行**: 25〜35文字程度

## 画像配置ルール

人物写真を使う場合、**顔にコンテンツを被せない**:

| 顔の位置 | テキスト配置 |
|---------|-------------|
| 右側 | 左配置 |
| 左側 | 右配置 |
| 中央 | 上下配置 or 半透明オーバーレイ |

```css
/* 顔が右の場合 */
.hero-content {
  max-width: 50%;
  margin-right: auto;
}

/* 顔が左の場合 */
.hero-content {
  max-width: 50%;
  margin-left: auto;
}
```
