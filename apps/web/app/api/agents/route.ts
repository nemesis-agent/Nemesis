import { NextResponse } from "next/server";

import { listAgents, listAgentsForWallet } from "@nemesis/db";

/**
 * Lists agents. Pass ?wallet=0x... to filter to one wallet's agents —
 * without it, returns every agent in the database (fine for the current
 * single-demo-tenant state; once real wallet auth exists, this should
 * require the caller to be authenticated as that wallet rather than
 * trusting an arbitrary query param).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");

  const agents = wallet ? listAgentsForWallet(wallet) : listAgents();
  return NextResponse.json({ agents });
}
