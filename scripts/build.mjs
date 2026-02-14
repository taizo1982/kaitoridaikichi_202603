/**
 * LP Template - メインビルドスクリプト
 *
 * src/ の内容を最適化して build/ に出力
 * ※ src/ は読み取り専用（変更しない）
 *
 * 機能:
 * - 画像最適化（リサイズ、AVIF/WebP変換）
 * - width/height自動付与
 * - lazy loading自動付与（最初の画像以外）
 * - <img>→<picture>変換
 * - OGP/metaタグ注入
 * - 広告タグ注入
 * - コンバージョンコード注入
 * - 構造化データ生成
 * - favicon生成
 * - HTML/CSS minify
 * - JS トランスパイル（ES6+ → ES5）+ minify
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { minify as minifyHtml } from "html-minifier-terser";
import CleanCSS from "clean-css";
import { minify as minifyJs } from "terser";
import sharp from "sharp";
import * as babel from "@babel/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const srcDir = path.resolve(projectRoot, "src");
const buildDir = path.resolve(projectRoot, "build");

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

// 画像サイズ情報を読み込み
async function loadImageDimensions() {
  const dimensionsPath = path.resolve(projectRoot, ".image-dimensions.json");
  try {
    const content = await fs.readFile(dimensionsPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

// ディレクトリをコピー
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
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

  tags.push(`<meta property="og:type" content="${escapeHtml(env.OG_TYPE || 'website')}">`);

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
    tags.push(`<meta property="og:image:width" content="${env.OG_IMAGE_WIDTH || '1200'}">`);
    tags.push(`<meta property="og:image:height" content="${env.OG_IMAGE_HEIGHT || '630'}">`);
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

  // Microsoft Clarity
  if (env.CLARITY_PROJECT_ID) {
    tags.push(`
<!-- Microsoft Clarity -->
<script>
  (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window,document,"clarity","script","${env.CLARITY_PROJECT_ID}");
</script>`);
  }

  return tags.join("\n");
}

// JSON-LD用のエスケープ処理（XSS対策）
function escapeJsonLd(obj) {
  const json = JSON.stringify(obj);
  return json.replace(/<\//g, "<\\/");
}

// 単一タイプの構造化データを生成
function generateSingleStructuredData(type, env, html) {
  switch (type.toLowerCase().trim()) {
    case "event": {
      const name = env.EVENT_NAME || env.SITE_TITLE;
      if (!name) {
        console.warn("Event structured data requires EVENT_NAME or SITE_TITLE");
        return null;
      }
      return {
        "@context": "https://schema.org",
        "@type": "Event",
        name,
        ...(env.EVENT_DESCRIPTION || env.SITE_DESCRIPTION
          ? { description: env.EVENT_DESCRIPTION || env.SITE_DESCRIPTION }
          : {}),
        ...(env.EVENT_IMAGE_URL || env.OG_IMAGE_URL
          ? { image: env.EVENT_IMAGE_URL || env.OG_IMAGE_URL }
          : {}),
        ...(env.EVENT_START_DATE && { startDate: env.EVENT_START_DATE }),
        ...(env.EVENT_END_DATE && { endDate: env.EVENT_END_DATE }),
        ...((env.EVENT_LOCATION_NAME || env.EVENT_LOCATION_ADDRESS) && {
          location: {
            "@type": "Place",
            ...(env.EVENT_LOCATION_NAME && { name: env.EVENT_LOCATION_NAME }),
            ...(env.EVENT_LOCATION_ADDRESS && { address: env.EVENT_LOCATION_ADDRESS }),
          },
        }),
        ...(env.EVENT_OFFER_PRICE && {
          offers: {
            "@type": "Offer",
            price: env.EVENT_OFFER_PRICE,
            priceCurrency: env.EVENT_OFFER_CURRENCY || "JPY",
            availability: "https://schema.org/InStock",
            ...(env.EVENT_OFFER_URL || env.OG_URL
              ? { url: env.EVENT_OFFER_URL || env.OG_URL }
              : {}),
          },
        }),
        ...(env.EVENT_PERFORMER && {
          performer: {
            "@type": "Person",
            name: env.EVENT_PERFORMER,
          },
        }),
        ...(env.OG_SITE_NAME && {
          organizer: {
            "@type": "Organization",
            name: env.OG_SITE_NAME,
          },
        }),
      };
    }

    case "product": {
      const name = env.PRODUCT_NAME || env.SITE_TITLE;
      if (!name) {
        console.warn("Product structured data requires PRODUCT_NAME or SITE_TITLE");
        return null;
      }
      return {
        "@context": "https://schema.org",
        "@type": "Product",
        name,
        ...(env.SITE_DESCRIPTION && { description: env.SITE_DESCRIPTION }),
        ...(env.OG_IMAGE_URL && { image: env.OG_IMAGE_URL }),
        ...(env.PRODUCT_BRAND && { brand: env.PRODUCT_BRAND }),
        ...(env.PRODUCT_PRICE && {
          offers: {
            "@type": "Offer",
            price: env.PRODUCT_PRICE,
            priceCurrency: env.PRODUCT_CURRENCY || "JPY",
            availability: env.PRODUCT_AVAILABILITY || "https://schema.org/InStock",
          },
        }),
      };
    }

    case "localbusiness": {
      const name = env.BUSINESS_NAME || env.OG_SITE_NAME;
      if (!name) {
        console.warn("LocalBusiness structured data requires BUSINESS_NAME or OG_SITE_NAME");
        return null;
      }
      const address = env.BUSINESS_ADDRESS;
      const city = env.BUSINESS_CITY;
      return {
        "@context": "https://schema.org",
        "@type": env.BUSINESS_TYPE || "LocalBusiness",
        name,
        ...(env.SITE_DESCRIPTION && { description: env.SITE_DESCRIPTION }),
        ...(env.BUSINESS_IMAGE_URL || env.OG_IMAGE_URL
          ? { image: env.BUSINESS_IMAGE_URL || env.OG_IMAGE_URL }
          : {}),
        ...(env.BUSINESS_PHONE && { telephone: env.BUSINESS_PHONE }),
        ...(env.BUSINESS_URL || env.OG_URL
          ? { url: env.BUSINESS_URL || env.OG_URL }
          : {}),
        ...(env.BUSINESS_PRICE_RANGE && { priceRange: env.BUSINESS_PRICE_RANGE }),
        // addressとcityが両方存在する場合のみPostalAddressを生成
        ...(address && city && {
          address: {
            "@type": "PostalAddress",
            streetAddress: address,
            addressLocality: city,
            ...(env.BUSINESS_REGION && { addressRegion: env.BUSINESS_REGION }),
            ...(env.BUSINESS_POSTAL_CODE && { postalCode: env.BUSINESS_POSTAL_CODE }),
            addressCountry: env.BUSINESS_COUNTRY || "JP",
          },
        }),
      };
    }

    case "organization": {
      const name = env.ORG_NAME || env.OG_SITE_NAME;
      const url = env.ORG_URL || env.OG_URL;
      if (!name || !url) {
        console.warn("Organization structured data requires name and url");
        return null;
      }
      return {
        "@context": "https://schema.org",
        "@type": "Organization",
        name,
        url,
        ...(env.ORG_LOGO_URL || env.OG_IMAGE_URL
          ? { logo: env.ORG_LOGO_URL || env.OG_IMAGE_URL }
          : {}),
        ...(env.ORG_DESCRIPTION || env.SITE_DESCRIPTION
          ? { description: env.ORG_DESCRIPTION || env.SITE_DESCRIPTION }
          : {}),
        ...(env.ORG_EMAIL && { email: env.ORG_EMAIL }),
        ...(env.ORG_PHONE && { telephone: env.ORG_PHONE }),
      };
    }

    case "faqpage": {
      // FAQをHTMLから抽出
      const faqItems = [];
      const faqRegex = /<summary[^>]*>([\s\S]*?)<\/summary>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi;
      let match;
      while ((match = faqRegex.exec(html)) !== null) {
        const question = match[1].trim();
        const answer = match[2].trim();
        if (question && answer) {
          faqItems.push({
            "@type": "Question",
            name: question,
            acceptedAnswer: {
              "@type": "Answer",
              text: answer,
            },
          });
        }
      }
      if (faqItems.length > 0) {
        return {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems,
        };
      }
      return null;
    }

    default:
      console.warn(`Unknown structured data type: ${type}`);
      return null;
  }
}

// 構造化データを生成（複数タイプ対応）
function generateStructuredData(env, html) {
  const typeString = env.STRUCTURED_DATA_TYPE;
  if (!typeString) return "";

  // カンマ区切りで分割して複数タイプに対応
  const types = typeString.split(",").map((t) => t.trim()).filter(Boolean);
  if (types.length === 0) return "";

  const scripts = [];

  for (const type of types) {
    const data = generateSingleStructuredData(type, env, html);
    if (data) {
      scripts.push(`<script type="application/ld+json">${escapeJsonLd(data)}</script>`);
    }
  }

  return scripts.join("\n");
}

// コンバージョン追跡コードを生成
function generateConversionCode(env) {
  const code = [];

  code.push(`
(function() {
  document.querySelectorAll('[data-cv]').forEach(function(el) {
    el.addEventListener('click', function() {
      var cvType = this.dataset.cv;
      var label = this.textContent || this.innerText;
`);

  if (env.GA_MEASUREMENT_ID) {
    code.push(`
      if (typeof gtag === 'function') {
        gtag('event', cvType, { event_category: 'conversion', event_label: label });
      }`);
  }

  if (env.GA_ADS_ID && env.GA_ADS_CONVERSION_LABEL) {
    code.push(`
      if (typeof gtag === 'function') {
        gtag('event', 'conversion', { send_to: '${env.GA_ADS_ID}/${env.GA_ADS_CONVERSION_LABEL}' });
      }`);
  }

  if (env.META_PIXEL_ID) {
    code.push(`
      if (typeof fbq === 'function') {
        fbq('track', cvType === 'tel' ? 'Contact' : 'Lead');
      }`);
  }

  if (env.LINE_TAG_ID) {
    code.push(`
      if (typeof _lt === 'function') {
        _lt('send', 'cv', { type: cvType });
      }`);
  }

  if (env.YAHOO_CONVERSION_ID && env.YAHOO_CONVERSION_LABEL) {
    code.push(`
      if (typeof ytag === 'function') {
        ytag('conversion', { yahoo_conversion_id: '${env.YAHOO_CONVERSION_ID}', yahoo_conversion_label: '${env.YAHOO_CONVERSION_LABEL}' });
      }`);
  }

  code.push(`
    });
  });
`);

  // スクロール深度トラッキング
  if (env.TRACK_SCROLL_DEPTH === "true" && env.GA_MEASUREMENT_ID) {
    code.push(`
  var scrollTracked = {};
  window.addEventListener('scroll', function() {
    var scrollPercent = Math.floor((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100);
    [25, 50, 75, 90].forEach(function(point) {
      if (scrollPercent >= point && !scrollTracked[point]) {
        scrollTracked[point] = true;
        if (typeof gtag === 'function') { gtag('event', 'scroll_depth', { depth: point }); }
      }
    });
  });
`);
  }

  // 滞在時間トラッキング
  if (env.TRACK_TIME_ON_PAGE && env.GA_MEASUREMENT_ID) {
    const times = env.TRACK_TIME_ON_PAGE.split(",").map((t) => parseInt(t.trim(), 10));
    code.push(`
  var timeTracked = {};
  var timePoints = ${JSON.stringify(times)};
  var startTime = Date.now();
  setInterval(function() {
    var elapsed = Math.floor((Date.now() - startTime) / 1000);
    timePoints.forEach(function(seconds) {
      if (elapsed >= seconds && !timeTracked[seconds]) {
        timeTracked[seconds] = true;
        if (typeof gtag === 'function') { gtag('event', 'time_on_page', { seconds: seconds }); }
      }
    });
  }, 1000);
`);
  }

  code.push(`})();`);
  return code.join("");
}

// SP画像のセットを取得
async function findSpImages(dir) {
  const spImages = new Set();

  async function scan(currentDir) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile()) {
          // -sp サフィックスを持つ画像を検出
          if (/-sp\.(png|jpe?g)$/i.test(entry.name)) {
            // PC画像名を計算（-spを除去）
            const pcName = entry.name.replace(/-sp(\.(png|jpe?g))$/i, "$1");
            const relativePath = path.relative(dir, path.join(currentDir, pcName));
            spImages.add(relativePath);
          }
        }
      }
    } catch {
      // ディレクトリが存在しない場合は無視
    }
  }

  await scan(dir);
  return spImages;
}

// width/height自動付与 + lazy loading + <picture>変換 + PC/SP出し分け
async function processImages(html, dimensions, basePath = "", spImages = new Set()) {
  let imageIndex = 0;
  // BASE_PATHを正規化（末尾スラッシュを除去、先頭スラッシュを確保）
  const prefix = basePath ? basePath.replace(/\/$/, "") : "";
  const warnings = [];

  // 1. 既存の<picture>要素を保護（ネスト防止）
  const pictureBlocks = [];
  html = html.replace(/<picture[\s\S]*?<\/picture>/gi, (match) => {
    pictureBlocks.push(match);
    return `__PICTURE_PLACEHOLDER_${pictureBlocks.length - 1}__`;
  });

  // <img>タグを処理（既存の<picture>内の<img>は除外済み）
  const imgRegex = /<img([^>]*)src=["']([^"']+)["']([^>]*)>/gi;

  html = html.replace(imgRegex, (match, before, src, after) => {
    imageIndex++;
    const isFirst = imageIndex === 1;

    // すでにwidth/heightがあるかチェック
    const hasWidth = /width=/i.test(before + after);
    const hasHeight = /height=/i.test(before + after);
    const hasLazy = /loading=/i.test(before + after);

    let newBefore = before;
    let newAfter = after;

    // width/height を追加
    if (!hasWidth || !hasHeight) {
      const relativePath = src.startsWith("/") ? src.slice(1) : src;
      const dimKey = Object.keys(dimensions).find((k) => k.endsWith(relativePath));
      if (dimKey && dimensions[dimKey]) {
        const { width, height } = dimensions[dimKey];
        if (!hasWidth) newAfter += ` width="${width}"`;
        if (!hasHeight) newAfter += ` height="${height}"`;
      }
    }

    // lazy loading を追加（最初の画像以外）
    if (!isFirst && !hasLazy) {
      newAfter += ' loading="lazy"';
    }

    // <picture>変換（PNG/JPG/JPEGの場合）
    const ext = path.extname(src).toLowerCase();
    if ([".png", ".jpg", ".jpeg"].includes(ext)) {
      const baseName = src.replace(/\.(png|jpe?g)$/i, "");
      // 相対パスの場合はBASE_PATHを適用
      const imgPrefix = src.startsWith("/") || src.startsWith("http") ? "" : prefix ? `${prefix}/` : "";
      const srcWithPrefix = src.startsWith("/") || src.startsWith("http") ? src : `${imgPrefix}${src}`;
      const baseNameWithPrefix = src.startsWith("/") || src.startsWith("http") ? baseName : `${imgPrefix}${baseName}`;

      // SP画像があるかチェック
      const relativeSrc = src.startsWith("/") ? src.slice(1) : src;
      const hasSpImage = spImages.has(relativeSrc);

      if (hasSpImage) {
        // SP画像がある場合: PC/SP出し分け
        const spBaseName = baseName.replace(/(\.(png|jpe?g))$/i, "") + "-sp";
        const spBaseNameWithPrefix = src.startsWith("/") || src.startsWith("http")
          ? spBaseName
          : `${imgPrefix}${spBaseName}`;
        const spSrcWithPrefix = src.startsWith("/") || src.startsWith("http")
          ? `${spBaseName}${ext}`
          : `${imgPrefix}${spBaseName}${ext}`;

        return `<picture>
  <source media="(max-width: 767px)" srcset="${spBaseNameWithPrefix}.avif" type="image/avif">
  <source media="(max-width: 767px)" srcset="${spBaseNameWithPrefix}.webp" type="image/webp">
  <source media="(max-width: 767px)" srcset="${spSrcWithPrefix}">
  <source srcset="${baseNameWithPrefix}.avif" type="image/avif">
  <source srcset="${baseNameWithPrefix}.webp" type="image/webp">
  <img${newBefore}src="${srcWithPrefix}"${newAfter}>
</picture>`;
      } else {
        // SP画像がない場合: 通常のpicture要素
        return `<picture>
  <source srcset="${baseNameWithPrefix}.avif" type="image/avif">
  <source srcset="${baseNameWithPrefix}.webp" type="image/webp">
  <img${newBefore}src="${srcWithPrefix}"${newAfter}>
</picture>`;
      }
    }

    // 相対パスの場合はBASE_PATHを適用
    if (!src.startsWith("/") && !src.startsWith("http") && prefix) {
      return `<img${newBefore}src="${prefix}/${src}"${newAfter}>`;
    }

    return `<img${newBefore}src="${src}"${newAfter}>`;
  });

  // 3. プレースホルダーを復元（既存の<picture>要素を元に戻す）
  pictureBlocks.forEach((block, i) => {
    html = html.replace(`__PICTURE_PLACEHOLDER_${i}__`, block);
  });

  return { html, warnings };
}

// favicon生成
async function generateFavicons(srcDir, buildDir, basePath = "") {
  const faviconSrc = path.join(srcDir, "images", "favicon.png");

  try {
    await fs.access(faviconSrc);
  } catch {
    console.log("  favicon.png not found, skipping favicon generation");
    return "";
  }

  const sizes = [
    { size: 16, name: "favicon-16x16.png" },
    { size: 32, name: "favicon-32x32.png" },
    { size: 180, name: "apple-touch-icon.png" },
    { size: 192, name: "android-chrome-192x192.png" },
    { size: 512, name: "android-chrome-512x512.png" },
  ];

  const faviconTags = [];

  for (const { size, name } of sizes) {
    const outputPath = path.join(buildDir, name);
    await sharp(faviconSrc).resize(size, size).png().toFile(outputPath);
  }

  // ICO生成（16x16）
  const icoPath = path.join(buildDir, "favicon.ico");
  await sharp(faviconSrc).resize(32, 32).toFile(icoPath);

  // BASE_PATHを適用（末尾スラッシュを正規化）
  const prefix = basePath ? basePath.replace(/\/$/, "") : "";

  faviconTags.push(`<link rel="icon" type="image/x-icon" href="${prefix}/favicon.ico">`);
  faviconTags.push(`<link rel="icon" type="image/png" sizes="16x16" href="${prefix}/favicon-16x16.png">`);
  faviconTags.push(`<link rel="icon" type="image/png" sizes="32x32" href="${prefix}/favicon-32x32.png">`);
  faviconTags.push(`<link rel="apple-touch-icon" sizes="180x180" href="${prefix}/apple-touch-icon.png">`);

  console.log("✓ Favicon generated");
  return `<!-- Favicon -->\n${faviconTags.join("\n")}`;
}

// CSSを最適化
async function optimizeCss(filePath) {
  const css = await fs.readFile(filePath, "utf-8");
  const result = new CleanCSS({ level: 2 }).minify(css);
  return result.styles;
}

// JSを最適化（トランスパイル + ミニファイ）
async function optimizeJs(filePath, env) {
  let js = await fs.readFile(filePath, "utf-8");

  // プレースホルダーを削除
  js = js.replace(/\/\/\s*__CONVERSION_CODE_PLACEHOLDER__/g, "");

  // コンバージョンコードを追加
  const conversionCode = generateConversionCode(env);
  js = js.trim() + "\n\n" + conversionCode;

  // Babel でトランスパイル（ES6+ → ES5）
  const transpiled = await babel.transformAsync(js, {
    presets: [
      [
        "@babel/preset-env",
        {
          targets: "> 0.5%, last 2 versions, not dead, IE 11",
          useBuiltIns: false, // ポリフィルは別途必要な場合のみ追加
        },
      ],
    ],
    compact: false,
  });

  // Terser でミニファイ
  const result = await minifyJs(transpiled.code, { compress: true, mangle: true });
  return result.code;
}

// メインビルド処理
async function build() {
  console.log("Building LP...\n");

  const env = await loadEnv();
  const dimensions = await loadImageDimensions();

  // BASE_PATHを取得（末尾スラッシュを除去）
  const basePath = env.BASE_PATH ? env.BASE_PATH.replace(/\/$/, "") : "";
  if (basePath) {
    console.log(`Using BASE_PATH: ${basePath}`);
  }

  // build/ をクリア
  await fs.rm(buildDir, { recursive: true, force: true });
  await fs.mkdir(buildDir, { recursive: true });

  // images/ をコピー
  const imagesDir = path.join(srcDir, "images");
  let spImages = new Set();
  try {
    await fs.access(imagesDir);
    await copyDir(imagesDir, path.join(buildDir, "images"));
    // SP画像を検出
    spImages = await findSpImages(srcDir);
    if (spImages.size > 0) {
      console.log(`✓ Images copied (${spImages.size} SP images detected)`);
    } else {
      console.log("✓ Images copied");
    }
  } catch {
    console.log("  No images directory");
  }

  // Favicon生成
  let faviconTags = "";
  try {
    faviconTags = await generateFavicons(srcDir, buildDir, basePath);
  } catch (error) {
    console.log(`  Favicon generation skipped: ${error.message}`);
  }

  // .htaccess をコピー
  const htaccessSrc = path.join(srcDir, ".htaccess");
  try {
    await fs.access(htaccessSrc);
    await fs.copyFile(htaccessSrc, path.join(buildDir, ".htaccess"));
    console.log("✓ .htaccess copied");
  } catch {
    // .htaccess が無い場合はスキップ
  }

  // HTML処理
  const htmlPath = path.join(srcDir, "index.html");
  try {
    let html = await fs.readFile(htmlPath, "utf-8");

    // タイトルを更新
    if (env.SITE_TITLE) {
      html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(env.SITE_TITLE)}</title>`);
    }

    // OGP/metaタグを注入
    const metaTags = generateMetaTags(env);
    html = html.replace("</head>", `${metaTags}\n</head>`);

    // 広告タグを注入
    const analyticsTags = generateAnalyticsTags(env);
    html = html.replace("</head>", `${analyticsTags}\n</head>`);

    // Faviconタグを注入
    if (faviconTags) {
      html = html.replace("</head>", `${faviconTags}\n</head>`);
    }

    // 構造化データを注入
    const structuredData = generateStructuredData(env, html);
    if (structuredData) {
      html = html.replace("</head>", `${structuredData}\n</head>`);
    }

    // 画像処理（width/height、lazy loading、picture変換、PC/SP出し分け）
    const imageResult = await processImages(html, dimensions, basePath, spImages);
    html = imageResult.html;

    // CSS/JSリンクを更新（BASE_PATHを適用）
    const cssHref = basePath ? `${basePath}/style.min.css` : "style.min.css";
    const jsHref = basePath ? `${basePath}/script.min.js` : "script.min.js";
    html = html.replace('href="style.css"', `href="${cssHref}"`);
    html = html.replace('src="script.js"', `src="${jsHref}"`);

    // minify
    const minified = await minifyHtml(html, {
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: true,
      minifyJS: true,
    });

    await fs.writeFile(path.join(buildDir, "index.html"), minified);
    console.log("✓ HTML optimized");
  } catch (error) {
    console.error("✗ HTML optimization failed:", error.message);
  }

  // CSS処理
  const cssPath = path.join(srcDir, "style.css");
  try {
    const css = await optimizeCss(cssPath);
    await fs.writeFile(path.join(buildDir, "style.min.css"), css);
    console.log("✓ CSS optimized");
  } catch (error) {
    console.error("✗ CSS optimization failed:", error.message);
  }

  // JS処理
  const jsPath = path.join(srcDir, "script.js");
  try {
    const js = await optimizeJs(jsPath, env);
    await fs.writeFile(path.join(buildDir, "script.min.js"), js);
    console.log("✓ JS optimized (transpiled + minified)");
  } catch (error) {
    console.error("✗ JS optimization failed:", error.message);
  }

  console.log("\n✓ Build complete! Output: build/");
}

build().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
