import Link from "next/link";

type BreadcrumbItem = {
  name: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

/**
 * Visible breadcrumb trail rendered as an accessible <nav>.
 * The last item is the current page (no link, aria-current="page").
 * Styled subtly with label-mono / editorial-link to match the site's
 * typographic system without competing with the article title.
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Okruszki" className="mb-5">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-x-1.5">
              {index > 0 && (
                <span
                  className="label-mono select-none text-stone/45"
                  aria-hidden="true"
                >
                  /
                </span>
              )}

              {isLast || !item.href ? (
                <span
                  className="label-mono"
                  {...(isLast ? { "aria-current": "page" as const } : {})}
                >
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="label-mono transition-opacity duration-editorial hover:opacity-70"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
