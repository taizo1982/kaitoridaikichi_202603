/**
 * LP Template - 広告タグ注入スクリプト
 *
 * build/index.html に .env の設定から広告タグを注入
 * GA4, Google Ads, Meta Pixel, LINE Tag, Yahoo Tag 対応
 * ※ src/ はビルド中に変更しない（元データを保持）
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./inject-meta.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// 広告タグを生成
function generateAnalyticsTags(env) {
  const tags = [];

  // Google Analytics 4
  if (env.GA_MEASUREMENT_ID) {
    tags.push(`
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${env.GA_MEASUREMENT_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${env.GA_MEASUREMENT_ID}');
  ${env.GA_ADS_ID ? `gtag('config', '${env.GA_ADS_ID}');` : ""}
</script>`);
  }

  // Meta Pixel
  if (env.META_PIXEL_ID) {
    tags.push(`
<!-- Meta Pixel -->
<script>
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${env.META_PIXEL_ID}');
  fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${env.META_PIXEL_ID}&ev=PageView&noscript=1"/></noscript>`);
  }

  // LINE Tag
  if (env.LINE_TAG_ID) {
    tags.push(`
<!-- LINE Tag -->
<script>
  (function(g,d,o){g._ltq=g._ltq||[];g._lt=g._lt||function(){g._ltq.push(arguments)};
  var h=d.getElementsByTagName(o)[0];var s=d.createElement(o);s.async=1;
  s.src='https://d.line-scdn.net/n/line_tag/public/release/v1/lt.js';
  h.parentNode.insertBefore(s,h)})(window,document,'script');
  _lt('init',{customerType:'account',tagId:'${env.LINE_TAG_ID}'});
  _lt('send','pv',['${env.LINE_TAG_ID}']);
</script>
<noscript><img height="1" width="1" style="display:none" src="https://tr.line.me/tag.gif?c_t=lap&t_id=${env.LINE_TAG_ID}&e=pv&noscript=1"/></noscript>`);
  }

  // Yahoo Tag
  if (env.YAHOO_RETARGETING_ID) {
    tags.push(`
<!-- Yahoo Tag -->
<script async src="https://s.yimg.jp/images/listing/tool/cv/ytag.js"></script>
<script>
  window.yjDataLayer = window.yjDataLayer || [];
  function ytag(){yjDataLayer.push(arguments);}
  ytag('config', { yahoo_ss_retargeting_id: '${env.YAHOO_RETARGETING_ID}' });
</script>`);
  }

  return tags.join("\n");
}

async function injectAnalytics(targetPath) {
  const env = await loadEnv();

  let html = await fs.readFile(targetPath, "utf-8");

  // 既存の広告タグコメントブロックを削除
  html = html.replace(/<!-- Google Analytics -->[\s\S]*?<\/script>/g, "");
  html = html.replace(/<!-- Meta Pixel -->[\s\S]*?<\/noscript>/g, "");
  html = html.replace(/<!-- LINE Tag -->[\s\S]*?<\/noscript>/g, "");
  html = html.replace(/<!-- Yahoo Tag -->[\s\S]*?<\/script>/g, "");

  // 広告タグを生成
  const analyticsTags = generateAnalyticsTags(env);

  if (analyticsTags) {
    html = html.replace("</head>", `${analyticsTags}\n</head>`);
  }

  await fs.writeFile(targetPath, html);

  const enabledTags = [];
  if (env.GA_MEASUREMENT_ID) enabledTags.push("GA4");
  if (env.META_PIXEL_ID) enabledTags.push("Meta Pixel");
  if (env.LINE_TAG_ID) enabledTags.push("LINE Tag");
  if (env.YAHOO_RETARGETING_ID) enabledTags.push("Yahoo Tag");

  if (enabledTags.length > 0) {
    console.log(`✓ 広告タグを注入しました: ${enabledTags.join(", ")}`);
  } else {
    console.log("⚠ 広告タグが設定されていません（.envを確認してください）");
  }
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
    await injectAnalytics(targetPath);
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

export { generateAnalyticsTags };
