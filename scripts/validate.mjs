/**
 * LP Template - PageSpeed Insights 検証スクリプト
 *
 * PageSpeed Insights API を使用してパフォーマンススコアを取得
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./inject-meta.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

// スコアを色付きで表示
function formatScore(score) {
  const percent = Math.round(score * 100);
  if (percent >= 90) return `\x1b[32m${percent}\x1b[0m`; // 緑
  if (percent >= 50) return `\x1b[33m${percent}\x1b[0m`; // 黄
  return `\x1b[31m${percent}\x1b[0m`; // 赤
}

// PageSpeed Insights API を呼び出し
async function runPageSpeedTest(url, strategy = "mobile") {
  const params = new URLSearchParams({
    url: url,
    strategy: strategy,
    category: "performance",
    category: "accessibility",
    category: "best-practices",
    category: "seo",
  });

  // API キーがあれば追加
  const env = await loadEnv();
  if (env.PAGESPEED_API_KEY) {
    params.append("key", env.PAGESPEED_API_KEY);
  }

  const apiUrl = `${API_ENDPOINT}?${params.toString()}`;

  console.log(`\n検証中: ${url}`);
  console.log(`デバイス: ${strategy === "mobile" ? "モバイル" : "デスクトップ"}\n`);

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(`PageSpeed API エラー: ${error.message}`);
  }
}

// 結果を表示
function displayResults(data, strategy) {
  const categories = data.lighthouseResult?.categories;

  if (!categories) {
    console.log("スコアを取得できませんでした");
    return null;
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  ${strategy === "mobile" ? "📱 モバイル" : "🖥️  デスクトップ"} スコア`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const scores = {};

  if (categories.performance) {
    scores.performance = categories.performance.score;
    console.log(`  Performance:    ${formatScore(categories.performance.score)}`);
  }

  if (categories.accessibility) {
    scores.accessibility = categories.accessibility.score;
    console.log(`  Accessibility:  ${formatScore(categories.accessibility.score)}`);
  }

  if (categories["best-practices"]) {
    scores.bestPractices = categories["best-practices"].score;
    console.log(`  Best Practices: ${formatScore(categories["best-practices"].score)}`);
  }

  if (categories.seo) {
    scores.seo = categories.seo.score;
    console.log(`  SEO:            ${formatScore(categories.seo.score)}`);
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Core Web Vitals
  const audits = data.lighthouseResult?.audits;
  if (audits) {
    console.log("  Core Web Vitals:");

    if (audits["largest-contentful-paint"]) {
      const lcp = audits["largest-contentful-paint"].displayValue;
      console.log(`    LCP: ${lcp}`);
    }

    if (audits["cumulative-layout-shift"]) {
      const cls = audits["cumulative-layout-shift"].displayValue;
      console.log(`    CLS: ${cls}`);
    }

    if (audits["total-blocking-time"]) {
      const tbt = audits["total-blocking-time"].displayValue;
      console.log(`    TBT: ${tbt}`);
    }

    if (audits["first-contentful-paint"]) {
      const fcp = audits["first-contentful-paint"].displayValue;
      console.log(`    FCP: ${fcp}`);
    }

    if (audits["speed-index"]) {
      const si = audits["speed-index"].displayValue;
      console.log(`    Speed Index: ${si}`);
    }

    console.log("");
  }

  return scores;
}

// 改善提案を表示
function displayOpportunities(data) {
  const audits = data.lighthouseResult?.audits;
  if (!audits) return;

  const opportunities = Object.values(audits)
    .filter((audit) => audit.details?.type === "opportunity" && audit.score !== null && audit.score < 1)
    .sort((a, b) => (b.details?.overallSavingsMs || 0) - (a.details?.overallSavingsMs || 0))
    .slice(0, 5);

  if (opportunities.length > 0) {
    console.log("  改善の提案:");
    opportunities.forEach((opp) => {
      const savings = opp.details?.overallSavingsMs;
      const savingsText = savings ? ` (${Math.round(savings)}ms 削減可能)` : "";
      console.log(`    - ${opp.title}${savingsText}`);
    });
    console.log("");
  }
}

// メイン処理
async function main() {
  const url = process.argv[2];

  if (!url) {
    console.error("使用方法: node scripts/validate.mjs <URL>");
    console.error("例: node scripts/validate.mjs https://example.com");
    console.error("\nオプション:");
    console.error("  --desktop    デスクトップのみテスト");
    console.error("  --mobile     モバイルのみテスト");
    console.error("  --both       両方テスト（デフォルト）");
    process.exit(1);
  }

  const args = process.argv.slice(3);
  const desktopOnly = args.includes("--desktop");
  const mobileOnly = args.includes("--mobile");

  console.log("\n🔍 PageSpeed Insights 検証を開始します...");

  const results = {
    url: url,
    timestamp: new Date().toISOString(),
    mobile: null,
    desktop: null,
  };

  try {
    // モバイルテスト
    if (!desktopOnly) {
      const mobileData = await runPageSpeedTest(url, "mobile");
      results.mobile = displayResults(mobileData, "mobile");
      displayOpportunities(mobileData);
    }

    // デスクトップテスト
    if (!mobileOnly) {
      const desktopData = await runPageSpeedTest(url, "desktop");
      results.desktop = displayResults(desktopData, "desktop");
      displayOpportunities(desktopData);
    }

    // 合格/不合格の判定
    const allScores = [
      ...(results.mobile ? Object.values(results.mobile) : []),
      ...(results.desktop ? Object.values(results.desktop) : []),
    ];

    const avgScore = allScores.reduce((sum, s) => sum + s, 0) / allScores.length;
    const passed = avgScore >= 0.9;

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    if (passed) {
      console.log("✅ 検証結果: 合格（平均スコア 90点以上）");
    } else {
      console.log(`⚠️  検証結果: 要改善（平均スコア ${Math.round(avgScore * 100)}点）`);
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // 終了コード（CI用）
    process.exitCode = passed ? 0 : 1;
  } catch (error) {
    console.error(`\n❌ エラー: ${error.message}`);
    console.error("\nヒント:");
    console.error("  - URLが正しいか確認してください");
    console.error("  - サイトが公開されているか確認してください");
    console.error("  - API制限に達した場合は、.envにPAGESPEED_API_KEYを設定してください");
    process.exit(1);
  }
}

main();

export { runPageSpeedTest, displayResults };
