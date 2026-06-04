/**
 * Usuwa białe tło z public/idrivecars-logo.png i zapisuje:
 * - idrivecars-logo-dark.png (czarny wordmark)
 * - idrivecars-logo-light.png (biały wordmark)
 *
 * Uruchom: npx tsx scripts/process-logo.ts
 */
import { writeFileSync } from "fs";
import sharp from "sharp";

const THRESH = 235;
const SRC = "public/idrivecars-logo.png";
const TRIM = { threshold: 10 };

async function main() {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const dark = Buffer.from(data);
  const light = Buffer.from(data);

  for (let i = 0; i < width * height; i++) {
    const idx = i * channels;
    const r = dark[idx];
    const g = dark[idx + 1];
    const b = dark[idx + 2];
    if (r >= THRESH && g >= THRESH && b >= THRESH) {
      dark[idx + 3] = 0;
      light[idx + 3] = 0;
      continue;
    }
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const alpha = Math.min(255, Math.round(255 - lum * 0.92));
    dark[idx] = dark[idx + 1] = dark[idx + 2] = 0;
    dark[idx + 3] = alpha;
    light[idx] = light[idx + 1] = light[idx + 2] = 255;
    light[idx + 3] = alpha;
  }

  for (const [buf, out] of [
    [dark, "public/idrivecars-logo-dark.png"],
    [light, "public/idrivecars-logo-light.png"]
  ] as const) {
    const png = await sharp(buf, { raw: { width, height, channels: 4 } })
      .png({ compressionLevel: 9, palette: true, quality: 90 })
      .trim(TRIM)
      .toBuffer();
    writeFileSync(out, png);
    const meta = await sharp(out).metadata();
    console.log(`${out}: ${meta.width}x${meta.height}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
