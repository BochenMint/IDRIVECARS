/** Sanity limits for pros/cons bullet lists (frontmatter, not article body). */
export const PROS_CONS_MAX_ITEM_LENGTH = 220;
export const PROS_CONS_MAX_ITEMS = 12;
export const PROS_CONS_MAX_TOTAL_LENGTH = 1800;

const SECTION_STOP = /^(zalety|wady|plusy|minusy|podsumowanie)\s*:?\s*$/i;
const URL_LIKE = /^https?:\/\//i;

/**
 * Filters parser/import noise — e.g. entire article captured after incidental "wady" in prose.
 */
export function sanitizeProsConsList(items: string[] | undefined): string[] {
  if (!items?.length) return [];

  const cleaned: string[] = [];
  for (const raw of items) {
    const item = raw.replace(/\s+/g, " ").trim();
    if (!item || item.length < 2) continue;
    if (item.length > PROS_CONS_MAX_ITEM_LENGTH) continue;
    if (SECTION_STOP.test(item)) continue;
    if (URL_LIKE.test(item)) continue;
    if (/nie zapomnijcie obejrzeć/i.test(item)) continue;
    cleaned.push(item);
    if (cleaned.length >= PROS_CONS_MAX_ITEMS) break;
  }

  const total = cleaned.join("").length;
  if (!cleaned.length || total > PROS_CONS_MAX_TOTAL_LENGTH) return [];
  return cleaned;
}

export function isAbsurdProsCons(items: string[] | undefined): boolean {
  if (!items?.length) return false;
  if (items.length > PROS_CONS_MAX_ITEMS) return true;
  if (items.some((i) => (i?.length ?? 0) > PROS_CONS_MAX_ITEM_LENGTH)) return true;
  if (items.join("").length > PROS_CONS_MAX_TOTAL_LENGTH) return true;
  return false;
}
