/**
 * LP Template - タイポグラフィチェック
 *
 * 375pxでの孤立文字（1-2文字の行末）を検出
 */

import puppeteer from "puppeteer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const srcPath = path.resolve(projectRoot, "src", "index.html");

async function checkTypography() {
  console.log("Checking typography at 375px...\n");

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  // 375px幅に設定
  await page.setViewport({ width: 375, height: 812 });

  // ローカルファイルを開く
  await page.goto(`file://${srcPath}`, { waitUntil: "networkidle0" });

  // テキスト要素をチェック
  const issues = await page.evaluate(() => {
    const results = [];
    const textElements = document.querySelectorAll("h1, h2, h3, h4, h5, h6, p, span, a, li, td, th, label, button");

    textElements.forEach((el) => {
      const text = el.innerText || el.textContent;
      if (!text || text.length < 3) return;

      // 要素の幅を取得
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;

      // Range APIで行ごとのテキストを取得
      const range = document.createRange();
      const textNode = el.firstChild;

      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

      try {
        range.selectNodeContents(el);
        const rects = range.getClientRects();

        // 複数行ある場合、最終行の文字数をチェック
        if (rects.length > 1) {
          const lastRect = rects[rects.length - 1];
          const avgCharWidth = rect.width / (text.length / rects.length);
          const lastLineChars = Math.round(lastRect.width / avgCharWidth);

          if (lastLineChars <= 2 && lastLineChars > 0) {
            results.push({
              tag: el.tagName.toLowerCase(),
              class: el.className,
              text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
              lastLineChars: lastLineChars,
              selector: getSelector(el),
            });
          }
        }
      } catch (e) {
        // ignore
      }
    });

    function getSelector(el) {
      if (el.id) return `#${el.id}`;
      if (el.className) return `${el.tagName.toLowerCase()}.${el.className.split(" ").join(".")}`;
      return el.tagName.toLowerCase();
    }

    return results;
  });

  await browser.close();

  if (issues.length === 0) {
    console.log("✓ 孤立文字の問題は見つかりませんでした");
  } else {
    console.log(`✗ ${issues.length}件の孤立文字を検出:\n`);
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue.selector}`);
      console.log(`   テキスト: "${issue.text}"`);
      console.log(`   最終行: ${issue.lastLineChars}文字`);
      console.log(`   対策: 改行位置を調整するか、文言を微調整してください\n`);
    });
  }

  return issues;
}

checkTypography().catch((error) => {
  console.error("Typography check failed:", error.message);
  console.log("\nNote: This script requires Puppeteer. Run 'npm install' first.");
  process.exit(1);
});
