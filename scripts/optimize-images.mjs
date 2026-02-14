/**
 * LP Template - 画像最適化スクリプト
 *
 * - 最大1920pxにリサイズ
 * - AVIF/WebP形式に変換
 * - 元画像はフォールバック用に保持
 */

import path from "path";
import { fileURLToPath } from "url";
import { stat, writeFile, readdir } from "fs/promises";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設定
const MAX_WIDTH = 1920;
const targetDirs = [
  path.resolve(__dirname, "../src"),
  path.resolve(__dirname, "../src/images"),
];
const imageExtensions = [".png", ".jpg", ".jpeg"];

// 画像を検索
async function findImages(dir) {
  const images = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subImages = await findImages(fullPath);
        images.push(...subImages);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (imageExtensions.includes(ext)) {
          images.push(fullPath);
        }
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Warning: Could not read directory ${dir}:`, error.message);
    }
  }

  return images;
}

// 更新が必要か確認
async function needsUpdate(inputPath, outputPath) {
  try {
    const [inputStat, outputStat] = await Promise.all([
      stat(inputPath),
      stat(outputPath),
    ]);
    return inputStat.mtimeMs > outputStat.mtimeMs;
  } catch (error) {
    if (error.code === "ENOENT") {
      return true;
    }
    throw error;
  }
}

// 画像を処理（リサイズ + 圧縮 + 変換）
async function processImage(imagePath) {
  const dir = path.dirname(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const baseName = path.basename(imagePath, path.extname(imagePath));

  let image = sharp(imagePath);
  const metadata = await image.metadata();
  let resized = false;
  let compressed = false;

  // 1920pxより大きい場合はリサイズ
  if (metadata.width > MAX_WIDTH) {
    image = image.resize(MAX_WIDTH, null, {
      withoutEnlargement: true,
      fit: "inside",
    });
    resized = true;
    console.log(`  Resized: ${metadata.width}px → ${MAX_WIDTH}px`);
  }

  // 元画像を圧縮して保存（JPG: quality 85）
  if (ext === ".jpg" || ext === ".jpeg") {
    const compressedBuffer = await image.clone().jpeg({ quality: 85 }).toBuffer();
    await writeFile(imagePath, compressedBuffer);
    compressed = true;
    if (!resized) {
      console.log(`  Compressed: JPG (quality: 85)`);
    }
  } else if (ext === ".png") {
    // PNGはリサイズ時のみ保存（ロスレス）
    if (resized) {
      const resizedBuffer = await image.clone().png().toBuffer();
      await writeFile(imagePath, resizedBuffer);
    }
  }

  // 変換対象
  const targets = [
    {
      format: "avif",
      output: path.join(dir, `${baseName}.avif`),
      options: { quality: 60 },
    },
    {
      format: "webp",
      output: path.join(dir, `${baseName}.webp`),
      options: { quality: 80 },
    },
  ];

  let converted = false;

  for (const target of targets) {
    if (!resized && !compressed && !(await needsUpdate(imagePath, target.output))) {
      continue;
    }

    let buffer;
    if (target.format === "webp") {
      buffer = await image.clone().webp(target.options).toBuffer();
    } else if (target.format === "avif") {
      buffer = await image.clone().avif(target.options).toBuffer();
    } else {
      continue;
    }

    await writeFile(target.output, buffer);
    console.log(`  → ${path.basename(target.output)} (${target.format})`);
    converted = true;
  }

  return { resized, compressed, converted };
}

// 画像サイズ情報を取得（width/height自動付与用）
async function getImageDimensions(imagePath) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  return {
    width: metadata.width,
    height: metadata.height,
  };
}

// メイン処理
async function run() {
  console.log("画像を最適化中...\n");
  console.log(`設定: 最大幅 ${MAX_WIDTH}px\n`);

  let allImages = [];
  for (const dir of targetDirs) {
    const images = await findImages(dir);
    allImages.push(...images);
  }

  // 重複を除去
  allImages = [...new Set(allImages)];

  if (allImages.length === 0) {
    console.log("画像が見つかりませんでした。");
    return;
  }

  console.log(`${allImages.length}個の画像を検出\n`);

  let resizedCount = 0;
  let compressedCount = 0;
  let convertedCount = 0;
  const dimensions = {};

  for (const imagePath of allImages) {
    try {
      console.log(`Processing: ${path.relative(process.cwd(), imagePath)}`);
      const result = await processImage(imagePath);

      if (result.resized) resizedCount++;
      if (result.compressed) compressedCount++;
      if (result.converted) convertedCount++;

      // 画像サイズを記録
      const dims = await getImageDimensions(imagePath);
      dimensions[path.relative(process.cwd(), imagePath)] = dims;
    } catch (error) {
      console.error(`  Error: ${error.message}`);
    }
  }

  console.log(`\n完了!`);
  console.log(`  リサイズ: ${resizedCount}個`);
  console.log(`  圧縮: ${compressedCount}個`);
  console.log(`  変換: ${convertedCount}個`);

  // 画像サイズ情報をJSONに保存（width/height自動付与用）
  const dimensionsPath = path.resolve(__dirname, "../.image-dimensions.json");
  await writeFile(dimensionsPath, JSON.stringify(dimensions, null, 2));
  console.log(`\n画像サイズ情報を保存: .image-dimensions.json`);
}

run().catch((error) => {
  console.error("Image optimization failed:", error);
  process.exitCode = 1;
});

export { getImageDimensions, findImages };
