/**
 * LP Template - OGP/metaタグ注入スクリプト
 *
 * build/index.html に .env の設定からOGP/metaタグを注入
 * ※ src/ はビルド中に変更しない（元データを保持）
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// 環境変数の読み込み
async function loadEnv() {
  const envPath = path.resolve(projectRoot, ".env");
  const env = {};

  try {
    const content = await fs.readFile(envPath, "utf-8");
    content.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        env[key.trim()] = valueParts.join("=").trim();
      }
    });
  } catch (error) {
    console.log("Note: .env file not found, using defaults");
  }

  return env;
}

// HTMLエスケープ
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// OGP/metaタグを生成
function generateMetaTags(env) {
  const tags = [];

  if (env.SITE_DESCRIPTION) {
    tags.push(`<meta name="description" content="${escapeHtml(env.SITE_DESCRIPTION)}">`);
  }

  if (env.OG_TYPE) {
    tags.push(`<meta property="og:type" content="${escapeHtml(env.OG_TYPE)}">`);
  }

  if (env.SITE_TITLE) {
    tags.push(`<meta property="og:title" content="${escapeHtml(env.SITE_TITLE)}">`);
  }

  if (env.SITE_DESCRIPTION) {
    tags.push(`<meta property="og:description" content="${escapeHtml(env.SITE_DESCRIPTION)}">`);
  }

  if (env.OG_URL) {
    tags.push(`<meta property="og:url" content="${escapeHtml(env.OG_URL)}">`);
  }

  if (env.OG_IMAGE_URL) {
    tags.push(`<meta property="og:image" content="${escapeHtml(env.OG_IMAGE_URL)}">`);
    if (env.OG_IMAGE_WIDTH) {
      tags.push(`<meta property="og:image:width" content="${env.OG_IMAGE_WIDTH}">`);
    }
    if (env.OG_IMAGE_HEIGHT) {
      tags.push(`<meta property="og:image:height" content="${env.OG_IMAGE_HEIGHT}">`);
    }
  }

  if (env.OG_SITE_NAME) {
    tags.push(`<meta property="og:site_name" content="${escapeHtml(env.OG_SITE_NAME)}">`);
  }

  tags.push(`<meta property="og:locale" content="${env.OG_LOCALE || 'ja_JP'}">`);

  // Twitter Card
  tags.push(`<meta name="twitter:card" content="${env.TWITTER_CARD || 'summary_large_image'}">`);

  if (env.TWITTER_SITE) {
    tags.push(`<meta name="twitter:site" content="${escapeHtml(env.TWITTER_SITE)}">`);
  }

  if (env.SITE_TITLE) {
    tags.push(`<meta name="twitter:title" content="${escapeHtml(env.SITE_TITLE)}">`);
  }

  if (env.SITE_DESCRIPTION) {
    tags.push(`<meta name="twitter:description" content="${escapeHtml(env.SITE_DESCRIPTION)}">`);
  }

  if (env.OG_IMAGE_URL) {
    tags.push(`<meta name="twitter:image" content="${escapeHtml(env.OG_IMAGE_URL)}">`);
  }

  return tags.length > 0 ? `<!-- OGP -->\n${tags.join("\n")}` : "";
}

async function injectMeta(targetPath) {
  const env = await loadEnv();

  let html = await fs.readFile(targetPath, "utf-8");

  // 既存のOGPコメントブロックを削除
  html = html.replace(/<!-- OGP -->[\s\S]*?(?=<\/head>|<meta|<link|<script|<style)/g, "");

  // metaタグを生成
  const metaTags = generateMetaTags(env);

  if (metaTags) {
    html = html.replace("</head>", `${metaTags}\n</head>`);
  }

  // タイトルを更新
  if (env.SITE_TITLE) {
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(env.SITE_TITLE)}</title>`);
  }

  await fs.writeFile(targetPath, html);
  console.log(`✓ OGP/metaタグを注入しました: ${path.basename(targetPath)}`);
}

// メイン処理
async function main() {
  const targetPath = process.argv[2] || path.resolve(projectRoot, "build", "index.html");
  const resolvedPath = path.resolve(targetPath);
  const srcPath = path.resolve(projectRoot, "src");

  // src/ への書き込みを防止
  if (resolvedPath.startsWith(srcPath)) {
    console.error("✗ src/ フォルダは変更できません。build/ を使用してください。");
    process.exit(1);
  }

  try {
    await fs.access(targetPath);
    await injectMeta(targetPath);
  } catch (error) {
    console.error(`✗ ファイルが見つかりません: ${targetPath}`);
    console.error("  先に npm run build を実行してください。");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});

export { generateMetaTags, loadEnv, escapeHtml };
