/**
 * Walidacja treści MDX — uruchom: npm run validate:content
 */
import { validateAllContent } from "../src/lib/content/validate";

async function main() {
  const issues = await validateAllContent();
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  if (warnings.length) {
    console.log(`\n⚠ Ostrzeżenia (${warnings.length}):`);
    for (const w of warnings) {
      console.log(`  [${w.slug}] ${w.field ? `${w.field}: ` : ""}${w.message}`);
      console.log(`    → ${w.file}`);
    }
  }

  if (errors.length) {
    console.error(`\n✖ Błędy (${errors.length}):`);
    for (const e of errors) {
      console.error(`  [${e.slug}] ${e.field ? `${e.field}: ` : ""}${e.message}`);
      console.error(`    → ${e.file}`);
    }
    process.exit(1);
  }

  console.log(`\n✓ Walidacja OK (${issues.length} ostrzeżeń, 0 błędów).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
