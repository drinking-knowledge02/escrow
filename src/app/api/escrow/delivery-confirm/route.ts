import { NextRequest, NextResponse } from "next/server";
import { capturePayment } from "@/lib/adapters/shopify-escrow";

export async function POST(req: NextRequest) {
  try {
    const { escrowId } = await req.json();
    if (!escrowId) {
      return NextResponse.json({ error: "escrowId is required" }, { status: 400 });
    }
    const result = await capturePayment(escrowId);
    return NextResponse.json({
      success: true,
      message: "Delivery confirmed - payment released",
      transactionDetails: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delivery confirmation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
