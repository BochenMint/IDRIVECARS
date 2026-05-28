import { NextRequest, NextResponse } from "next/server";
import { setNewsDecision } from "@/lib/content/news";
import type { UserDecision } from "@/lib/content/types-news";

/**
 * POST: zapisuje decyzję redaktora (worth | skip) dla newsa – do uczenia modelu AI.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = body?.slug as string | undefined;
    const userDecision = body?.userDecision as UserDecision | undefined;
    if (!slug || !userDecision || (userDecision !== "worth" && userDecision !== "skip")) {
      return NextResponse.json({ error: "Invalid slug or userDecision" }, { status: 400 });
    }
    await setNewsDecision(slug, userDecision);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
