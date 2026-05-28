import Link from "next/link";

/**
 * Panel administracyjny – docelowo chroniony middleware / NextAuth.
 * Moduły: Reklamy (sloty), News (źródła RSS + kolejka + auto-publikacja).
 */
export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="border-b border-neutral-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/admin" className="font-semibold text-neutral-900">
            Panel IDRIVECARS
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="text-neutral-600 hover:text-neutral-900">
              Start
            </Link>
            <Link href="/admin/news" className="text-neutral-600 hover:text-neutral-900">
              News
            </Link>
            <Link href="/admin/news/press" className="text-neutral-600 hover:text-neutral-900">
              Serwisy prasowe
            </Link>
            <Link href="/admin/ads" className="text-neutral-600 hover:text-neutral-900">
              Reklamy
            </Link>
            <Link href="/" className="text-neutral-500 hover:text-neutral-700">
              Wróć na stronę
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
