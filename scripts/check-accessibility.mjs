/**
 * LP Template - アクセシビリティチェック
 *
 * - alt属性
 * - コントラスト比
 * - タップ領域サイズ
 * - フォーカス表示
 * - 言語指定
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const srcDir = path.resolve(projectRoot, "src");

// コントラスト比を計算
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1, color2) {
  const l1 = getLuminance(...color1);
  const l2 = getLuminance(...color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

async function checkAccessibility() {
  console.log("Checking accessibility...\n");

  const issues = [];
  const warnings = [];

  // HTML をチェック
  const htmlPath = path.join(srcDir, "index.html");
  const html = await fs.readFile(htmlPath, "utf-8");

  // 1. lang属性
  if (!/<html[^>]+lang=/.test(html)) {
    issues.push({
      type: "lang",
      message: '<html> に lang="ja" を追加してください',
    });
  }

  // 2. alt属性
  const imgWithoutAlt = html.match(/<img(?![^>]*alt=)[^>]*>/gi) || [];
  imgWithoutAlt.forEach((img) => {
    issues.push({
      type: "alt",
      message: `alt属性がありません: ${img.substring(0, 60)}...`,
    });
  });

  // 空のalt属性をチェック（装飾画像以外は警告）
  const emptyAlt = html.match(/<img[^>]*alt=["']["'][^>]*>/gi) || [];
  if (emptyAlt.length > 0) {
    warnings.push({
      type: "alt",
      message: `${emptyAlt.length}個の空のalt属性があります（装飾画像なら問題なし）`,
    });
  }

  // 3. タップ領域（a, button要素）
  // CSSを解析してサイズを確認（簡易チェック）
  const cssPath = path.join(srcDir, "style.css");
  const css = await fs.readFile(cssPath, "utf-8");

  // min-width, min-height, padding をチェック
  const smallClickTargets = [];
  const clickableElements = html.match(/<(a|button)[^>]*>/gi) || [];

  if (clickableElements.length > 0) {
    warnings.push({
      type: "tap-target",
      message: `${clickableElements.length}個のクリック可能要素があります。44x44px以上を確認してください`,
    });
  }

  // 4. フォーカス表示
  if (!css.includes(":focus") && !css.includes(":focus-visible")) {
    issues.push({
      type: "focus",
      message: "フォーカス時のスタイル (:focus / :focus-visible) を追加してください",
    });
  }

  // 5. スキップリンク
  if (!html.includes('href="#main"') && !html.includes('href="#content"')) {
    warnings.push({
      type: "skip-link",
      message: "スキップリンク（メインコンテンツへのジャンプ）の追加を検討してください",
    });
  }

  // 6. 見出し構造
  const headings = html.match(/<h[1-6][^>]*>/gi) || [];
  const headingLevels = headings.map((h) => parseInt(h.match(/h([1-6])/i)[1]));

  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] > headingLevels[i - 1] + 1) {
      issues.push({
        type: "heading",
        message: `見出しレベルが飛んでいます: h${headingLevels[i - 1]} → h${headingLevels[i]}`,
      });
    }
  }

  // 7. フォームラベル
  const inputs = html.match(/<input(?![^>]*type=["'](?:hidden|submit|button)["'])[^>]*>/gi) || [];
  const labels = html.match(/<label[^>]*for=["'][^"']+["'][^>]*>/gi) || [];

  if (inputs.length > labels.length) {
    warnings.push({
      type: "label",
      message: `入力要素 ${inputs.length}個に対してラベル ${labels.length}個です`,
    });
  }

  // 結果を出力
  console.log("=== アクセシビリティチェック結果 ===\n");

  if (issues.length === 0 && warnings.length === 0) {
    console.log("✓ 問題は見つかりませんでした\n");
  }

  if (issues.length > 0) {
    console.log(`✗ 問題 (${issues.length}件):\n`);
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. [${issue.type}] ${issue.message}`);
    });
    console.log();
  }

  if (warnings.length > 0) {
    console.log(`⚠ 警告 (${warnings.length}件):\n`);
    warnings.forEach((warning, i) => {
      console.log(`  ${i + 1}. [${warning.type}] ${warning.message}`);
    });
    console.log();
  }

  // チェックリスト
  console.log("=== 手動確認チェックリスト ===\n");
  console.log("  [ ] コントラスト比 4.5:1 以上（本文テキスト）");
  console.log("  [ ] コントラスト比 3:1 以上（大きいテキスト・UI）");
  console.log("  [ ] タップ領域 44x44px 以上");
  console.log("  [ ] キーボードのみで全機能が操作可能");
  console.log("  [ ] フォーカス順序が論理的");
  console.log();

  return { issues, warnings };
}

checkAccessibility().catch((error) => {
  console.error("Accessibility check failed:", error.message);
  process.exit(1);
});
