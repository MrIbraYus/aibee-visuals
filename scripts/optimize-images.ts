/**
 * Converts large design exports (PNG/JPG) into web-ready WebP files.
 *
 *   bun scripts/optimize-images.ts <inputDir> <outputDir> [maxWidth=2160]
 *
 * Every file in <inputDir> is resized (never upscaled) and written to
 * <outputDir>/<name>.webp. Use it before committing new portfolio pieces.
 */
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const [inputDir, outputDir, maxWidthArg] = process.argv.slice(2);

if (!inputDir || !outputDir) {
  console.error("Usage: bun scripts/optimize-images.ts <inputDir> <outputDir> [maxWidth]");
  process.exit(1);
}

const maxWidth = Number(maxWidthArg ?? 2160);
await mkdir(outputDir, { recursive: true });

const files = (await readdir(inputDir)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));

for (const file of files) {
  const src = path.join(inputDir, file);
  const out = path.join(outputDir, `${path.parse(file).name}.webp`);
  const info = await sharp(src)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 82, effort: 5, smartSubsample: true })
    .toFile(out);
  console.log(`${file} -> ${path.basename(out)} ${info.width}x${info.height} ${(info.size / 1024).toFixed(0)}kB`);
}
