import { NextRequest, NextResponse } from "next/server";
import { voidPayment } from "@/lib/adapters/shopify-escrow";

export async function POST(req: NextRequest) {
  try {
    const { escrowId } = await req.json();
    if (!escrowId) {
      return NextResponse.json({ error: "escrowId is required" }, { status: 400 });
    }
    const result = await voidPayment(escrowId);
    return NextResponse.json({
      success: true,
      message: "Payment voided successfully",
      transactionDetails: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cancel escrow failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
