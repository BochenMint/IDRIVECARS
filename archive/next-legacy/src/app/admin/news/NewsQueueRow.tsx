"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { NewsItem } from "@/lib/content/types-news";

type Props = { item: NewsItem };

export function NewsQueueRow({ item }: Props) {
  const router = useRouter();

  const setDecision = async (userDecision: "worth" | "skip") => {
    await fetch("/api/admin/news/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: item.slug, userDecision })
    });
    router.refresh();
  };

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 py-2 last:border-0">
      <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-400">
          {item.userDecision === "worth" && "✓ Warto"}
          {item.userDecision === "skip" && "✗ Pomiń"}
        </span>
        <button
          type="button"
          onClick={() => setDecision("worth")}
          className="rounded border border-green-300 bg-green-50 px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-100"
        >
          Warto
        </button>
        <button
          type="button"
          onClick={() => setDecision("skip")}
          className="rounded border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Pomiń
        </button>
        <Link
          href={`/news/${item.slug}`}
          target="_blank"
          rel="noopener"
          className="text-xs text-neutral-500 hover:underline"
        >
          Zobacz
        </Link>
      </div>
    </li>
  );
}
