import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

type HealthPayload = {
  status: "ok" | "degraded";
  service: string;
  timestamp: string;
  version: string;
  buildId: string | null;
  checks: {
    galleriesManifest: boolean;
  };
};

function readBuildId(): string | null {
  try {
    const buildIdPath = path.join(process.cwd(), ".next", "BUILD_ID");
    return readFileSync(buildIdPath, "utf8").trim() || null;
  } catch {
    return null;
  }
}

function galleriesManifestOk(): boolean {
  try {
    const manifestPath = path.join(process.cwd(), "src", "data", "galleries-manifest.json");
    const raw = readFileSync(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const galleryKeys = Object.keys(parsed).filter((key) => Array.isArray(parsed[key]));
    return galleryKeys.length > 0;
  } catch {
    return false;
  }
}

/** Lekki endpoint dla monitoringu uptime (UptimeRobot, cron, deploy script). */
export async function GET() {
  const galleriesOk = galleriesManifestOk();
  const buildId = readBuildId();

  const payload: HealthPayload = {
    status: galleriesOk ? "ok" : "degraded",
    service: "idrivecars",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.1.0",
    buildId,
    checks: {
      galleriesManifest: galleriesOk
    }
  };

  return NextResponse.json(payload, {
    status: galleriesOk ? 200 : 503,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
