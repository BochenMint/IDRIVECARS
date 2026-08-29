import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { updateRecordStatus } from "@/lib/news/pipeline";
import type { NewsPipelineStatus } from "@/lib/news/types";

const ALLOWED_STATUSES: NewsPipelineStatus[] = [
  "raw",
  "needs-ai-draft",
  "draft",
  "review",
  "published",
  "rejected"
];

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const recordId = body?.recordId as string | undefined;
    const status = body?.status as NewsPipelineStatus | undefined;

    if (!recordId || !status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid recordId or status" }, { status: 400 });
    }

    const record = await updateRecordStatus(recordId, status);
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, record });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
