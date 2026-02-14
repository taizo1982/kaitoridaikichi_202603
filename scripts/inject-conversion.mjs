/**
 * LP Template - コンバージョン追跡コード注入スクリプト
 *
 * build/script.js にコンバージョン追跡コードを注入
 * ※ src/ はビルド中に変更しない（元データを保持）
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./inject-meta.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// コンバージョン追跡コードを生成
function generateConversionCode(env) {
  const code = [];

  code.push(`
/**
 * コンバージョン追跡コード（自動生成）
 */
(function() {
  // data-cv属性を持つ要素のクリックを追跡
  document.querySelectorAll('[data-cv]').forEach(function(el) {
    el.addEventListener('click', function() {
      var cvType = this.dataset.cv;
      var label = this.textContent || this.innerText;
`);

  // GA4 イベント
  if (env.GA_MEASUREMENT_ID) {
    code.push(`
      // GA4
      if (typeof gtag === 'function') {
        gtag('event', cvType, {
          event_category: 'conversion',
          event_label: label
        });
      }`);
  }

  // Google Ads コンバージョン
  if (env.GA_ADS_ID && env.GA_ADS_CONVERSION_LABEL) {
    code.push(`
      // Google Ads
      if (typeof gtag === 'function') {
        gtag('event', 'conversion', {
          send_to: '${env.GA_ADS_ID}/${env.GA_ADS_CONVERSION_LABEL}'
        });
      }`);
  }

  // Meta Pixel
  if (env.META_PIXEL_ID) {
    code.push(`
      // Meta Pixel
      if (typeof fbq === 'function') {
        var metaEvent = cvType === 'tel' ? 'Contact' : 'Lead';
        fbq('track', metaEvent);
      }`);
  }

  // LINE Tag
  if (env.LINE_TAG_ID) {
    code.push(`
      // LINE Tag
      if (typeof _lt === 'function') {
        _lt('send', 'cv', { type: cvType });
      }`);
  }

  // Yahoo Tag
  if (env.YAHOO_CONVERSION_ID && env.YAHOO_CONVERSION_LABEL) {
    code.push(`
      // Yahoo
      if (typeof ytag === 'function') {
        ytag('conversion', {
          yahoo_conversion_id: '${env.YAHOO_CONVERSION_ID}',
          yahoo_conversion_label: '${env.YAHOO_CONVERSION_LABEL}'
        });
      }`);
  }

  code.push(`
    });
  });
`);

  // スクロール深度トラッキング
  if (env.TRACK_SCROLL_DEPTH === "true" && env.GA_MEASUREMENT_ID) {
    code.push(`
  // スクロール深度トラッキング
  var scrollTracked = {};
  window.addEventListener('scroll', function() {
    var scrollPercent = Math.floor((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100);
    [25, 50, 75, 90].forEach(function(point) {
      if (scrollPercent >= point && !scrollTracked[point]) {
        scrollTracked[point] = true;
        if (typeof gtag === 'function') {
          gtag('event', 'scroll_depth', { depth: point });
        }
      }
    });
  });
`);
  }

  // 滞在時間トラッキング
  if (env.TRACK_TIME_ON_PAGE && env.GA_MEASUREMENT_ID) {
    const times = env.TRACK_TIME_ON_PAGE.split(",").map((t) => parseInt(t.trim(), 10));
    code.push(`
  // 滞在時間トラッキング
  var timeTracked = {};
  var timePoints = ${JSON.stringify(times)};
  var startTime = Date.now();
  setInterval(function() {
    var elapsed = Math.floor((Date.now() - startTime) / 1000);
    timePoints.forEach(function(seconds) {
      if (elapsed >= seconds && !timeTracked[seconds]) {
        timeTracked[seconds] = true;
        if (typeof gtag === 'function') {
          gtag('event', 'time_on_page', { seconds: seconds });
        }
      }
    });
  }, 1000);
`);
  }

  code.push(`})();`);

  return code.join("");
}

async function injectConversion(targetPath) {
  const env = await loadEnv();

  let js = await fs.readFile(targetPath, "utf-8");

  // 既存のコンバージョンコードを削除
  js = js.replace(/\/\*\*\s*\n\s*\*\s*コンバージョン追跡コード[\s\S]*?\}\)\(\);/g, "");
  js = js.replace(/\/\/\s*__CONVERSION_CODE_PLACEHOLDER__/g, "");

  // コンバージョンコードを生成して追加
  const conversionCode = generateConversionCode(env);
  js = js.trim() + "\n\n" + conversionCode;

  await fs.writeFile(targetPath, js);
  console.log(`✓ コンバージョン追跡コードを注入しました: ${path.basename(targetPath)}`);
}

// メイン処理
async function main() {
  const targetPath = process.argv[2] || path.resolve(projectRoot, "build", "script.js");
  const resolvedPath = path.resolve(targetPath);
  const srcPath = path.resolve(projectRoot, "src");

  // src/ への書き込みを防止
  if (resolvedPath.startsWith(srcPath)) {
    console.error("✗ src/ フォルダは変更できません。build/ を使用してください。");
    process.exit(1);
  }

  try {
    await fs.access(targetPath);
    await injectConversion(targetPath);
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

export { generateConversionCode };
