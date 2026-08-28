import Image from "next/image";
import Link from "next/link";
import { LOGO_LIGHT } from "@/lib/logo";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-ink text-stone">
      <div className="flex flex-col gap-12 px-gutter py-20 sm:flex-row sm:items-end sm:justify-between md:gap-16 md:py-24">
        <div className="space-y-5">
          <Link href="/" className="inline-block transition-opacity duration-editorial hover:opacity-80">
            <Image
              src={LOGO_LIGHT.src}
              alt="IDRIVECARS"
              width={LOGO_LIGHT.width}
              height={LOGO_LIGHT.height}
              className="h-10 w-auto object-contain object-left md:h-12"
            />
          </Link>
          <p className="max-w-xs text-sm font-light leading-[1.85] text-stone-muted/90">
            Marcin Bochenek — testy, pierwsze jazdy, własne zdjęcia.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-10 gap-y-4 lg:gap-x-12" aria-label="Stopka">
          <Link
            href="/pierwsza-jazda"
            className="label-mono text-stone-muted transition-opacity duration-editorial hover:text-stone hover:opacity-100"
          >
            Pierwsza jazda
          </Link>
          <Link
            href="/testy"
            className="label-mono text-stone-muted transition-opacity duration-editorial hover:text-stone hover:opacity-100"
          >
            Testy
          </Link>
          <Link
            href="/galerie"
            className="label-mono text-stone-muted transition-opacity duration-editorial hover:text-stone hover:opacity-100"
          >
            Galerie
          </Link>
          <Link
            href="/news"
            className="label-mono text-stone-muted transition-opacity duration-editorial hover:text-stone hover:opacity-100"
          >
            News
          </Link>
          <Link
            href="/o-mnie"
            className="label-mono text-stone-muted transition-opacity duration-editorial hover:text-stone hover:opacity-100"
          >
            O mnie
          </Link>
          <Link
            href="/kontakt"
            className="label-mono text-stone-muted transition-opacity duration-editorial hover:text-stone hover:opacity-100"
          >
            Kontakt
          </Link>
          <Link
            href="/polityka-prywatnosci"
            className="label-mono text-stone-muted transition-opacity duration-editorial hover:text-stone hover:opacity-100"
          >
            Prywatność
          </Link>
          <Link
            href="/cookies"
            className="label-mono text-stone-muted transition-opacity duration-editorial hover:text-stone hover:opacity-100"
          >
            Cookies
          </Link>
          <Link
            href="/feed.xml"
            className="label-mono text-stone-muted transition-opacity duration-editorial hover:text-stone hover:opacity-100"
          >
            RSS
          </Link>
        </nav>
      </div>

      <div className="border-t border-white/[0.08] px-gutter py-6">
        <p className="label-mono text-stone/70">© {year} Marcin Bochenek</p>
      </div>
    </footer>
  );
}
