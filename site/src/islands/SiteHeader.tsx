import { useState } from "react";

const navItems = [
  { href: "/testy", label: "Testy" },
  { href: "/galerie", label: "Galerie" },
  { href: "/news", label: "News" },
  { href: "/blog", label: "Blog" },
  { href: "/o-mnie", label: "O mnie" },
  { href: "/kontakt", label: "Kontakt" },
];

type SiteHeaderProps = {
  currentPath?: string;
};

export default function SiteHeader({ currentPath = "/" }: SiteHeaderProps) {
  const [logoError, setLogoError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center no-underline" aria-label="Strona główna IDRIVECARS">
          {!logoError ? (
            <img
              src="/idrivecars-logo.jpg"
              alt="IDRIVECARS"
              width={180}
              height={72}
              className="h-9 w-auto object-contain object-left sm:h-10"
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="font-display text-2xl tracking-tight text-ink">
              I<span className="mx-1 text-muted">·</span>DRIVE<span className="ml-2 text-muted">CARS</span>
            </span>
          )}
        </a>

        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          {navItems.map((item) => {
            const isActive =
              currentPath === item.href || currentPath.startsWith(`${item.href}/`);
            return (
              <a
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "text-ink no-underline"
                    : "text-muted no-underline transition hover:text-ink"
                }
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <button
          type="button"
          className="rounded-md p-2 text-ink md:hidden"
          aria-label={menuOpen ? "Zamknij menu" : "Otwórz menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-neutral-200/80 px-4 py-4 md:hidden">
          <ul className="flex flex-col gap-3 text-sm font-medium">
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="block py-1 text-ink no-underline"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
