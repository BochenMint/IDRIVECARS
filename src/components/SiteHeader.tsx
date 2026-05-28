"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/testy", label: "Testy" },
  { href: "/galerie", label: "Galerie" },
  { href: "/news", label: "News" },
  { href: "/blog", label: "Blog" },
  { href: "/o-mnie", label: "O mnie" },
  { href: "/kontakt", label: "Kontakt" }
];

export function SiteHeader() {
  const pathname = usePathname();
  const [logoError, setLogoError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="Strona główna IDRIVECARS">
          {!logoError ? (
            <Image
              src="/idrivecars-logo.jpg"
              alt="IDRIVECARS"
              width={180}
              height={72}
              className="h-9 w-auto object-contain object-left sm:h-10"
              priority
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="font-display text-2xl tracking-tight text-ink">
              I<span className="mx-1 text-muted">·</span>DRIVE<span className="ml-2 text-muted">CARS</span>
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "text-ink"
                    : "text-muted transition hover:text-ink"
                }
              >
                {item.label}
              </Link>
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
                <Link
                  href={item.href}
                  className="block py-1 text-ink"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
