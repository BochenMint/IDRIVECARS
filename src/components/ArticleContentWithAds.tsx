"use client";

import { AdSlot } from "@/components/AdSlot";
import type { ArticleSegment } from "@/lib/ads/article-breaks";

type ArticleContentWithAdsProps = {
  segments: ArticleSegment[];
  pageKey: string;
};

export function ArticleContentWithAds({ segments, pageKey }: ArticleContentWithAdsProps) {
  let adIndex = 1;

  return (
    <>
      {segments.map((segment, i) => {
        if (segment.type === "ad-break") {
          const idx = adIndex;
          adIndex += 1;
          return (
            <div key={`${segment.id}-${i}`} className="my-14 flex justify-center lg:max-w-[65ch]">
              <AdSlot
                slotId="in-article-mid"
                format="in-article"
                slotIndex={idx}
                pageKey={pageKey}
              />
            </div>
          );
        }
        return (
          <div
            key={`html-${i}`}
            dangerouslySetInnerHTML={{ __html: segment.html }}
          />
        );
      })}
    </>
  );
}
