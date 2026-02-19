/**
 * LP Template - タイポグラフィチェック
 *
 * 375pxでの孤立文字（1-2文字の行末）を検出
 *
 * 改善点:
 * - テキストを直接持つ末端要素のみを対象にする（flex/gridの親liやaを除外）
 * - white-space: nowrap な要素をスキップ
 * - 非表示要素をスキップ
 * - 各テキストノードを個別に測定し、SVGやアイコン等のノイズを排除
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

    // TreeWalker でテキストノードを走査
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const text = node.textContent.trim();
          if (!text || text.length < 3) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const seen = new Set();

    while (walker.nextNode()) {
      const textNode = walker.currentNode;
      const parent = textNode.parentElement;
      if (!parent) continue;

      // 同一要素の重複チェック回避
      if (seen.has(parent)) continue;
      seen.add(parent);

      // 非表示要素をスキップ
      const style = window.getComputedStyle(parent);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

      // white-space: nowrap はそもそも折り返さない
      if (style.whiteSpace === "nowrap" || style.whiteSpace === "pre") continue;

      // 要素の幅がゼロならスキップ
      const elRect = parent.getBoundingClientRect();
      if (elRect.width === 0 || elRect.height === 0) continue;

      // 直接のテキストノードだけを Range で測定
      // 子要素（SVG, span等）のノイズを排除する
      const directTextNodes = Array.from(parent.childNodes).filter(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0
      );

      if (directTextNodes.length === 0) continue;

      try {
        const range = document.createRange();
        range.setStartBefore(directTextNodes[0]);
        range.setEndAfter(directTextNodes[directTextNodes.length - 1]);

        const rects = Array.from(range.getClientRects()).filter(
          (r) => r.width > 0 && r.height > 0
        );

        if (rects.length <= 1) continue;

        // 各行をY座標でグループ化（同一行の判定に4px許容）
        const lines = [];
        for (const r of rects) {
          const existing = lines.find((l) => Math.abs(l.top - r.top) < 4);
          if (existing) {
            existing.width = Math.max(existing.width, r.right - Math.min(existing.left, r.left));
            existing.left = Math.min(existing.left, r.left);
          } else {
            lines.push({ top: r.top, left: r.left, width: r.width, height: r.height });
          }
        }

        if (lines.length <= 1) continue;

        // 直接テキストの内容
        const directText = directTextNodes.map((n) => n.textContent.trim()).join("");
        if (directText.length < 3) continue;

        // 日本語文字の平均幅を推定（親要素のfont-sizeをベースに）
        const fontSize = parseFloat(style.fontSize);
        // 全角文字は約1em、半角は約0.5em
        const fullWidthCount = (directText.match(/[\u3000-\u9FFF\uF900-\uFAFF]/g) || []).length;
        const halfWidthCount = directText.length - fullWidthCount;
        const estimatedTextWidth = fullWidthCount * fontSize + halfWidthCount * fontSize * 0.6;
        const avgCharWidth = estimatedTextWidth / directText.length;

        // 最終行の文字数を推定
        const lastLine = lines[lines.length - 1];
        const lastLineChars = Math.round(lastLine.width / avgCharWidth);

        if (lastLineChars <= 2 && lastLineChars > 0) {
          results.push({
            tag: parent.tagName.toLowerCase(),
            class: parent.className,
            text: directText.substring(0, 50) + (directText.length > 50 ? "..." : ""),
            lastLineChars: lastLineChars,
            totalLines: lines.length,
            selector: getSelector(parent),
          });
        }
      } catch (e) {
        // ignore
      }
    }

    function getSelector(el) {
      if (el.id) return `#${el.id}`;
      if (el.className && typeof el.className === "string") {
        return `${el.tagName.toLowerCase()}.${el.className.split(" ").join(".")}`;
      }
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
      console.log(`   最終行: ${issue.lastLineChars}文字 (全${issue.totalLines}行)`);
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
