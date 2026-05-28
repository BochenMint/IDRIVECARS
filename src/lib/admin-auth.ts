import type { NextRequest } from "next/server";

export function getAdminSecret(): string | undefined {
  const secret = process.env.ADMIN_SECRET?.trim();
  return secret || undefined;
}

/** Weryfikuje Basic Auth (hasło = ADMIN_SECRET) lub Bearer token. */
export function isAdminAuthorized(request: NextRequest): boolean {
  const secret = getAdminSecret();
  if (!secret) return true;

  const bearer = request.headers.get("authorization");
  if (bearer === `Bearer ${secret}`) return true;

  const basic = bearer?.startsWith("Basic ") ? bearer.slice(6) : null;
  if (basic) {
    try {
      const decoded = atob(basic);
      const password = decoded.includes(":") ? decoded.split(":").slice(1).join(":") : decoded;
      if (password === secret) return true;
    } catch {
      /* invalid base64 */
    }
  }

  return false;
}

export const ADMIN_WWW_AUTHENTICATE = 'Basic realm="IDRIVECARS Admin", charset="UTF-8"';
