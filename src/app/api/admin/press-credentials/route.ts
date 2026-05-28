import { NextRequest, NextResponse } from "next/server";
import { savePressCredentials, type PressCredentials } from "@/lib/content/press";

/**
 * POST: zapisuje loginy/hasła do serwisów prasowych.
 * Docelowo zabezpieczyć (sesja admina / klucz API). Plik content/press-credentials.json jest w .gitignore.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const credentials: PressCredentials = {};
    for (const [id, value] of Object.entries(body)) {
      if (typeof id !== "string" || !value || typeof value !== "object") continue;
      const v = value as { login?: string; password?: string };
      credentials[id] = {
        login: typeof v.login === "string" ? v.login : "",
        password: typeof v.password === "string" ? v.password : ""
      };
    }
    await savePressCredentials(credentials);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
