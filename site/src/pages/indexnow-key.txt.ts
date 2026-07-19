import type { APIRoute } from 'astro';

/** IndexNow API key — replace with production key and host matching file at root. */
const INDEXNOW_KEY = import.meta.env.INDEXNOW_KEY ?? 'idrivecars-indexnow-key-placeholder';

export const GET: APIRoute = () => {
  return new Response(INDEXNOW_KEY, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
