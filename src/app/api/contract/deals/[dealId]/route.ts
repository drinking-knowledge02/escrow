import { NextRequest, NextResponse } from "next/server";
import { getDeal } from "@/lib/deals";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> },
) {
  try {
    const { dealId } = await params;
    const deal = getDeal(dealId);
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }
    return NextResponse.json(deal);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get deal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
