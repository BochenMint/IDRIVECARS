"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/testy", label: "Testy" },
  { href: "/galerie", label: "Galerie" },
  { href: "/o-mnie", label: "O mnie" },
  { href: "/kontakt", label: "Kontakt" }
];

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || !isHome;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        solid ? "bg-canvas/95 backdrop-blur-sm border-b border-line" : "bg-transparent"
      }`}
    >
      <div className="flex items-center justify-between px-gutter py-5">
        <Link
          href="/"
          className={`font-display text-2xl tracking-wide transition-colors ${
            solid || !isHome ? "text-ink" : "text-white"
          }`}
          aria-label="IDRIVECARS"
        >
          IDRIVE<span className="opacity-50">CARS</span>
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`label-mono transition-opacity hover:opacity-60 ${
                  solid || !isHome ? "text-ink" : "text-white/90"
                } ${active ? "opacity-100" : "opacity-70"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className={`label-mono md:hidden ${solid || !isHome ? "text-ink" : "text-white"}`}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Zamknij menu nawigacji" : "Otwórz menu nawigacji"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "Zamknij" : "Menu"}
        </button>
      </div>

      {menuOpen && (
        <nav id="mobile-nav" className="border-t border-line bg-canvas px-gutter py-6 md:hidden">
          <ul className="flex flex-col gap-4">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-display text-3xl text-ink"
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
