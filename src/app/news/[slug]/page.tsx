import Link from "next/link";
import { notFound } from "next/navigation";
import { getNewsBySlug, getAllNewsSlugs } from "@/lib/content/news";
import { AdSlot } from "@/components/AdSlot";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getAllNewsSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const item = await getNewsBySlug(slug);
  if (!item) return { title: "News | IDRIVECARS" };
  return { title: `${item.title} | News`, description: item.lead };
}

export default async function NewsSlugPage({ params }: Props) {
  const { slug } = await params;
  const item = await getNewsBySlug(slug);
  if (!item || item.status === "draft" || item.status === "rejected") notFound();

  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">News</p>
      <time dateTime={item.publishedAt} className="block text-sm text-neutral-500">
        {new Date(item.publishedAt).toLocaleDateString("pl-PL", { dateStyle: "long" })}
      </time>
      <h1 className="font-display text-2xl tracking-tight sm:text-3xl">{item.title}</h1>
      {item.lead && <p className="text-lg leading-relaxed text-neutral-700">{item.lead}</p>}
      <div className="py-4">
        <AdSlot slotId="in-article" format="in-article" />
      </div>
      <p className="text-sm text-neutral-600">
        Pełna treść:{" "}
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-neutral-900 underline underline-offset-2"
        >
          {item.sourceName}
        </a>
      </p>
      <Link href="/news" className="inline-block text-sm font-medium text-neutral-600 hover:text-neutral-900">
        ← Wszystkie newsy
      </Link>
    </article>
  );
}
