import { NextResponse } from "next/server";
import { getAgent } from "@nemesis/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Attempt a lightweight query through the same public DB API used by app routes.
    await getAgent("__healthcheck__");

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
    }, { status: 200 });
  } catch (error) {
    console.error("[Health Check Error]:", error);
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 503 });
  }
}