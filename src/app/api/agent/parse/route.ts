import { NextRequest, NextResponse } from "next/server";
import { getAgentAdapter } from "@/lib/adapters";
import type { ParsedIntent } from "@/lib/types";

function catalogQueryFromMessage(message: string): ParsedIntent {
  const amount = message.match(/\$\s*(\d+(?:\.\d+)?)/);
  return {
    query: message.trim() || "product",
    budget: amount ? Number(amount[1]) : 500,
    releaseCondition: /inspect/i.test(message)
      ? "on_inspection"
      : /pickup/i.test(message)
        ? "on_pickup"
        : "on_delivery",
  };
}

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  const text = typeof message === "string" ? message : "";

  try {
    const agent = getAgentAdapter();
    const intent = await agent.parseIntent(text);
    return NextResponse.json(intent);
  } catch (error) {
    console.error("[agent/parse] Falling back to live catalog query:", error);
    return NextResponse.json(catalogQueryFromMessage(text));
  }
}
