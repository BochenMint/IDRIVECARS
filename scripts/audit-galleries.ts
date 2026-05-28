import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import manifest from "../src/data/galleries-manifest.json";

async function main() {
  const CONTENT = path.join(process.cwd(), "content", "testy");
  const m = manifest as Record<string, unknown[]>;

  const files = (await fs.readdir(CONTENT)).filter(
    (f) => f.endsWith(".mdx") && f !== "README.md" && f !== "przykladowy-test.mdx"
  );

  let ok = 0,
    noDir = 0,
    noImg = 0;

  for (const f of files) {
    const slug = f.replace(".mdx", "");
    const { data } = matter(await fs.readFile(path.join(CONTENT, f), "utf8"));
    const gdir = data.galleryDir as string | undefined;
    if (!gdir) {
      noDir++;
      console.log("NO_DIR", slug);
      continue;
    }
    const gslug = gdir.replace(/^galleries[\\/]/, "").replace(/\\/g, "/");
    if (!m[gslug]?.length) {
      noImg++;
      console.log("NO_IMG", slug, "->", gslug);
    } else ok++;
  }

  console.log("\nOK:", ok, "NO_DIR:", noDir, "NO_IMG:", noImg, "TOTAL:", files.length);
}

main();
