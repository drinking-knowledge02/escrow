import { NextRequest, NextResponse } from "next/server";
import { getAgentAdapter } from "@/lib/adapters";

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  const agent = getAgentAdapter();
  const intent = await agent.parseIntent(message);
  return NextResponse.json(intent);
}
