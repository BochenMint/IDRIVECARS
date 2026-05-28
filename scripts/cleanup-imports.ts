/**
 * Usuwa uszkodzone importy RTF i duplikaty (gorsza wersja gdy istnieje lepsza z autoGaleria).
 * Uruchom: npx tsx scripts/cleanup-imports.ts
 */

import fs from "node:fs/promises";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "content", "testy");

const DUPLICATES_TO_REMOVE = [
  "ford-focus-rs.mdx",
  "mazda-mx-5.mdx",
  "mercedes-maybach-s600.mdx",
  "volkswagen-passat-alltrack.mdx",
  "mercedes.mdx",
  "mercedes-x6.mdx",
  "volkswagen-golf-gtd-variant.mdx",
  "smart-dct-turbo.mdx"
];

async function isCorrupt(filePath: string): Promise<boolean> {
  const buf = await fs.readFile(filePath);
  if (buf.includes(0)) return true;
  const text = buf.toString("utf8");
  if (text.includes("Msftedit") || text.includes("02020603050405020304")) return true;
  if (text.includes("\\* 020")) return true;
  return false;
}

async function main() {
  const files = (await fs.readdir(CONTENT_DIR)).filter((f) => f.endsWith(".mdx"));

  for (const file of DUPLICATES_TO_REMOVE) {
    const fp = path.join(CONTENT_DIR, file);
    try {
      await fs.unlink(fp);
      console.log(`  ✕ usunięto duplikat/uszkodzony: ${file}`);
    } catch {
      /* ignore */
    }
  }

  for (const file of files) {
    if (DUPLICATES_TO_REMOVE.includes(file)) continue;
    const fp = path.join(CONTENT_DIR, file);
    if (await isCorrupt(fp)) {
      await fs.unlink(fp);
      console.log(`  ✕ usunięto uszkodzony: ${file}`);
    }
  }

  const remaining = (await fs.readdir(CONTENT_DIR)).filter((f) => f.endsWith(".mdx"));
  console.log(`\nPozostało artykułów: ${remaining.length}`);
}

main().catch(console.error);
