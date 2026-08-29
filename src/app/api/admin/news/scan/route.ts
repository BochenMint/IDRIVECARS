import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { runNewsScan } from "@/lib/news/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScanBody = {
  dryRun?: boolean;
  downloadImages?: boolean;
  autoQueueAi?: boolean;
  sourceIds?: string[];
};

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sourceIds = request.nextUrl.searchParams
    .get("sourceIds")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const report = await runNewsScan({
    dryRun: true,
    sourceIds,
    downloadImages: false,
    autoQueueAi: false
  });

  return NextResponse.json({
    ok: true,
    mode: "dry-run",
    report
  });
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as ScanBody;
    const dryRun = body.dryRun !== false;

    const report = await runNewsScan({
      dryRun,
      sourceIds: body.sourceIds,
      downloadImages: dryRun ? false : body.downloadImages === true,
      autoQueueAi: dryRun ? false : body.autoQueueAi !== false
    });

    return NextResponse.json({
      ok: true,
      mode: dryRun ? "dry-run" : "write",
      report
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to scan news" }, { status: 500 });
  }
}
