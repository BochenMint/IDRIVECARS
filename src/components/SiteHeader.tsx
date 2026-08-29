"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LOGO_DARK, LOGO_LIGHT } from "@/lib/logo";

const navItems = [
  { href: "/testy", label: "Testy" },
  { href: "/galerie", label: "Galerie" },
  { href: "/news", label: "News" },
  { href: "/o-mnie", label: "O mnie" },
  { href: "/kontakt", label: "Kontakt" }
];

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 56);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onHero = isHome && !scrolled;
  const solidBlack = isHome && scrolled;

  const headerBg = solidBlack
    ? "border-b border-white/10 bg-ink"
    : onHero
      ? "border-b border-transparent bg-transparent"
      : "border-b border-soft bg-canvas/92 backdrop-blur-sm";

  const logoOnDark = solidBlack || onHero;
  const logo = logoOnDark ? LOGO_LIGHT : LOGO_DARK;
  const navClass = logoOnDark ? "text-stone" : "text-ink";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-500 ease-out ${headerBg}`}
    >
      <div className="flex items-center justify-between px-gutter py-5 md:py-[1.375rem]">
        <Link
          href="/"
          className="block transition-opacity duration-editorial hover:opacity-70"
          aria-label="IDRIVECARS — strona główna"
        >
          <Image
            src={logo.src}
            alt="IDRIVECARS"
            width={logo.width}
            height={logo.height}
            className="h-8 w-auto md:h-10 object-contain object-left"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-7 lg:gap-9 md:flex" aria-label="Główne menu">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`label-mono nav-link ${navClass} ${active ? "!opacity-100 underline underline-offset-4 decoration-1" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className={`label-mono md:hidden ${navClass}`}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Zamknij menu nawigacji" : "Otwórz menu nawigacji"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "Zamknij" : "Menu"}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          className={`border-t px-gutter py-10 md:hidden ${
            solidBlack || onHero ? "border-white/10 bg-ink" : "border-soft bg-canvas"
          }`}
        >
          <ul className="flex flex-col gap-7">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`font-display display-track text-display-md uppercase transition-opacity duration-editorial hover:opacity-50 ${
                      solidBlack || onHero ? "text-stone" : "text-ink"
                    } ${active ? "opacity-100" : ""}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
