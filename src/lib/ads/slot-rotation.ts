import { HOUSE_ADS, type HouseAd } from "./house-ads";

/** Deterministyczny hash FNV-1a — stabilny per path+slot (cache, CLS). */
export function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickHouseAd(slotId: string, pageKey: string): HouseAd {
  const idx = stableHash(`${pageKey}::${slotId}`) % HOUSE_ADS.length;
  return HOUSE_ADS[idx]!;
}

/**
 * Slot 1 → Google (gdy consent + AdSense), slot 2 → house rotacja, slot 3 → Google…
 * Gdy brak AdSense — zawsze house.
 */
export type SlotProvider = "google" | "house";

export function resolveSlotProvider(
  slotId: string,
  pageKey: string,
  slotIndex: number,
  hasAdSense: boolean
): SlotProvider {
  if (!hasAdSense) return "house";
  return slotIndex % 2 === 0 ? "google" : "house";
}
