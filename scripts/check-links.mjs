/**
 * LP Template - リンクチェック
 *
 * - 内部リンク（アンカー）の確認
 * - 外部リンクの rel="noopener" 確認
 * - 画像パスの確認
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const srcDir = path.resolve(projectRoot, "src");

async function checkLinks() {
  console.log("Checking links...\n");

  const issues = [];
  const warnings = [];

  // HTML を読み込み
  const htmlPath = path.join(srcDir, "index.html");
  const html = await fs.readFile(htmlPath, "utf-8");

  // 1. 内部アンカーリンクのチェック
  const anchorLinks = html.match(/href=["']#([^"']+)["']/gi) || [];
  const ids = html.match(/id=["']([^"']+)["']/gi) || [];
  const idSet = new Set(ids.map((id) => id.match(/id=["']([^"']+)["']/i)[1]));

  anchorLinks.forEach((link) => {
    const anchor = link.match(/href=["']#([^"']+)["']/i)[1];
    if (!idSet.has(anchor)) {
      issues.push({
        type: "anchor",
        message: `アンカー #${anchor} に対応する id が見つかりません`,
      });
    }
  });

  // 2. 外部リンクの rel 属性チェック
  const externalLinks = html.match(/<a[^>]+href=["']https?:\/\/[^"']+["'][^>]*>/gi) || [];
  externalLinks.forEach((link) => {
    if (link.includes('target="_blank"') || link.includes("target='_blank'")) {
      if (!link.includes("noopener") && !link.includes("noreferrer")) {
        const href = link.match(/href=["']([^"']+)["']/i)[1];
        issues.push({
          type: "security",
          message: `外部リンクに rel="noopener noreferrer" を追加してください: ${href.substring(0, 50)}`,
        });
      }
    }
  });

  // 3. 画像パスのチェック
  const images = html.match(/src=["']([^"']+\.(png|jpe?g|gif|svg|webp|avif))["']/gi) || [];
  for (const img of images) {
    const src = img.match(/src=["']([^"']+)["']/i)[1];

    // 絶対URLはスキップ
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("//")) {
      continue;
    }

    // 相対パスのチェック
    const imagePath = path.join(srcDir, src);
    try {
      await fs.access(imagePath);
    } catch {
      issues.push({
        type: "image",
        message: `画像が見つかりません: ${src}`,
      });
    }
  }

  // 4. CSSファイルのチェック
  const cssLinks = html.match(/href=["']([^"']+\.css)["']/gi) || [];
  for (const link of cssLinks) {
    const href = link.match(/href=["']([^"']+)["']/i)[1];
    if (!href.startsWith("http")) {
      const cssPath = path.join(srcDir, href);
      try {
        await fs.access(cssPath);
      } catch {
        issues.push({
          type: "css",
          message: `CSSファイルが見つかりません: ${href}`,
        });
      }
    }
  }

  // 5. JSファイルのチェック
  const jsLinks = html.match(/src=["']([^"']+\.js)["']/gi) || [];
  for (const link of jsLinks) {
    const src = link.match(/src=["']([^"']+)["']/i)[1];
    if (!src.startsWith("http")) {
      const jsPath = path.join(srcDir, src);
      try {
        await fs.access(jsPath);
      } catch {
        issues.push({
          type: "js",
          message: `JSファイルが見つかりません: ${src}`,
        });
      }
    }
  }

  // 6. tel: リンクの形式チェック
  const telLinks = html.match(/href=["']tel:([^"']+)["']/gi) || [];
  telLinks.forEach((link) => {
    const tel = link.match(/tel:([^"']+)/i)[1];
    // ハイフンありでも数字とハイフン以外があれば警告
    if (!/^[\d\-+]+$/.test(tel)) {
      warnings.push({
        type: "tel",
        message: `電話番号の形式を確認してください: ${tel}`,
      });
    }
  });

  // 7. mailto: リンクの形式チェック
  const mailLinks = html.match(/href=["']mailto:([^"']+)["']/gi) || [];
  mailLinks.forEach((link) => {
    const email = link.match(/mailto:([^"'?]+)/i)[1];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      warnings.push({
        type: "mailto",
        message: `メールアドレスの形式を確認してください: ${email}`,
      });
    }
  });

  // 結果を出力
  console.log("=== リンクチェック結果 ===\n");

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

  // サマリー
  console.log("=== サマリー ===\n");
  console.log(`  内部アンカー: ${anchorLinks.length}個`);
  console.log(`  外部リンク: ${externalLinks.length}個`);
  console.log(`  画像: ${images.length}個`);
  console.log(`  電話リンク: ${telLinks.length}個`);
  console.log(`  メールリンク: ${mailLinks.length}個`);
  console.log();

  return { issues, warnings };
}

checkLinks().catch((error) => {
  console.error("Link check failed:", error.message);
  process.exit(1);
});
