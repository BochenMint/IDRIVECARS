"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NewsPipelineStatus } from "@/lib/news/types";
import type { NewsReviewKind } from "@/lib/news/review";

type Props = {
  id: string;
  kind: NewsReviewKind;
  status: string;
};

const ACTIONS: Array<{ label: string; status: NewsPipelineStatus; className: string }> = [
  {
    label: "Do AI",
    status: "needs-ai-draft",
    className: "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100"
  },
  {
    label: "Review",
    status: "review",
    className: "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
  },
  {
    label: "Odrzuć",
    status: "rejected",
    className: "border-neutral-300 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
  }
];

export function NewsReviewActions({ id, kind, status }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<NewsPipelineStatus | null>(null);

  if (kind === "mdx") {
    return (
      <p className="text-xs text-neutral-500">
        MDX: zmień frontmatter <code>status</code> ręcznie po review.
      </p>
    );
  }

  const setStatus = async (nextStatus: NewsPipelineStatus) => {
    setPending(nextStatus);
    try {
      const res = await fetch("/api/admin/news/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId: id, status: nextStatus })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Nie udało się zmienić statusu");
      }
      router.refresh();
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((action) => (
        <button
          key={action.status}
          type="button"
          disabled={pending !== null || status === action.status}
          onClick={() => setStatus(action.status)}
          className={`rounded border px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-45 ${action.className}`}
        >
          {pending === action.status ? "Zapis..." : action.label}
        </button>
      ))}
    </div>
  );
}
