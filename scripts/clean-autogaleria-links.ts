/**
 * Czyści martwe linki i artefakty importu autoGALERIA z treści MDX.
 * Zachowuje originalUrl/sourceUrl w frontmatter.
 *
 * Uruchom: npx tsx scripts/clean-autogaleria-links.ts
 * Dry-run: npx tsx scripts/clean-autogaleria-links.ts --dry-run
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const CONTENT_DIRS = ["testy", "blog", "felieton", "news"] as const;
const CATEGORY_ROUTE: Record<string, string> = {
  test: "testy",
  "pierwsza-jazda": "testy",
  blog: "blog",
  felieton: "felieton",
  news: "news"
};

const AG_HOST = /(?:https?:\/\/)?(?:www\.)?autogaleria\.pl/i;
const YT_HOST = /(?:youtube\.com|youtu\.be)/i;

type SlugRoute = { slug: string; route: string };

async function buildSlugRoutes(): Promise<Map<string, SlugRoute>> {
  const map = new Map<string, SlugRoute>();
  for (const dir of CONTENT_DIRS) {
    const full = path.join(ROOT, "content", dir);
    if (!existsSync(full)) continue;
    for (const file of await fs.readdir(full)) {
      if (!file.endsWith(".mdx") && !file.endsWith(".md")) continue;
      const slug = file.replace(/\.mdx?$/, "");
      map.set(slug, { slug, route: dir });
    }
  }
  return map;
}

function extractAgSlug(url: string): string | null {
  const cleaned = url.replace(AG_HOST, "").replace(/^\//, "");
  const slug = cleaned.split(/[?#]/)[0]?.replace(/\/$/, "").split("/").pop();
  return slug && slug.length > 2 ? slug : null;
}

function internalHref(slugRoutes: Map<string, SlugRoute>, agUrl: string): string | null {
  const slug = extractAgSlug(agUrl);
  if (!slug) return null;
  const hit = slugRoutes.get(slug);
  if (!hit) return null;
  return `/${hit.route}/${hit.slug}`;
}

function cleanBody(body: string, slugRoutes: Map<string, SlugRoute>): { body: string; changes: number } {
  let changes = 0;
  let out = body;

  // Broken inline images from aG CDN wrapped in links — remove whole line.
  const brokenImageLine =
    /^\s*!\[[^\]]*\]\([^)]*\/content\/uploads\/[^)]*\)(?:\s*\([^)]*\))?\s*$/gim;
  out = out.replace(brokenImageLine, () => {
    changes++;
    return "";
  });

  // [![alt](img)](autogaleria...) — drop image block
  out = out.replace(/!\[[^\]]*\]\([^)]+\)\s*(?=\()/g, () => {
    changes++;
    return "";
  });

  // Empty or broken markdown links to autogaleria
  out = out.replace(/\[[^\]]*\]\([^)]*autogaleria\.pl[^)]*\)/gi, (full, ...args) => {
    const match = full.match(/\[([^\]]*)\]/);
    const text = match?.[1] ?? "";
    changes++;
    if (!text.trim()) return "";
    const hrefMatch = full.match(/\(([^)]+)\)/);
    const href = hrefMatch?.[1] ?? "";
    const internal = internalHref(slugRoutes, href);
    if (internal) return `[${text}](${internal})`;
    return text;
  });

  // Markdown links to autogaleria — internal rewrite or plain anchor text (non-AG hosts handled above)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (full, text: string, href: string) => {
    if (YT_HOST.test(href)) return full;
    if (!AG_HOST.test(href) && !href.startsWith("/auto_test/") && !href.startsWith("/testy/") && !href.startsWith("/nowosci/") && !href.startsWith("/pierwsze-jazdy/") && !href.startsWith("/migiem-o/")) {
      return full;
    }
    changes++;
    const internal = AG_HOST.test(href) ? internalHref(slugRoutes, href) : null;
    if (internal) return `[${text}](${internal})`;
    return text;
  });

  // Bare autogaleria URLs (not in markdown link)
  out = out.replace(
    /(?<!\]\()https?:\/\/(?:www\.)?autogaleria\.pl\/[^\s)\]"']+/gi,
    (url) => {
      if (YT_HOST.test(url)) return url;
      changes++;
      const internal = internalHref(slugRoutes, url);
      return internal ?? "";
    }
  );

  // Legacy relative aG paths in leftover links
  out = out.replace(
    /\[([^\]]+)\]\(\/(?:auto_test|testy|nowosci|pierwsze-jazdy|migiem-o)\/[^)]+\)/g,
    (_full, text: string) => {
      changes++;
      return text;
    }
  );

  // Standalone broken upload images
  out = out.replace(/!\[[^\]]*\]\(\/content\/uploads\/[^)]+\)/g, () => {
    changes++;
    return "";
  });

  out = out.replace(/\n{3,}/g, "\n\n").trim();
  return { body: out, changes };
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const slugRoutes = await buildSlugRoutes();
  let filesTouched = 0;
  let totalChanges = 0;

  for (const dir of CONTENT_DIRS) {
    const full = path.join(ROOT, "content", dir);
    if (!existsSync(full)) continue;
    for (const file of (await fs.readdir(full)).filter((f) => f.endsWith(".mdx"))) {
      const filePath = path.join(full, file);
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = matter(raw);
      const { body, changes } = cleanBody(parsed.content, slugRoutes);
      if (!changes) continue;

      filesTouched++;
      totalChanges += changes;
      const rel = path.relative(ROOT, filePath);
      console.log(`${dryRun ? "[dry-run] " : ""}${rel}: ${changes} zmian`);

      if (!dryRun) {
        const category =
          typeof parsed.data.category === "string" && CATEGORY_ROUTE[parsed.data.category as string]
            ? parsed.data.category
            : undefined;
        void category;
        await fs.writeFile(filePath, matter.stringify(body, parsed.data), "utf8");
      }
    }
  }

  console.log(
    `\n${dryRun ? "Dry-run: " : ""}oczyszczono ${filesTouched} plików (${totalChanges} zmian linków/obrazów).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
