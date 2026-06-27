import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const DATABASE_URL = process.env.DATABASE_URL;

declare global {
  // eslint-disable-next-line no-var
  var nemesisHealthPool: Pool | undefined;
}

function getHealthPool() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL must be set.");
  }

  globalThis.nemesisHealthPool ??= new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  return globalThis.nemesisHealthPool;
}

export async function GET() {
  try {
    await getHealthPool().query("SELECT 1");

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