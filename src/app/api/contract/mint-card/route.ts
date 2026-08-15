import { NextRequest, NextResponse } from "next/server";
import { mintScopedCard } from "@/lib/contract";

export async function POST(req: NextRequest) {
  try {
    const { merchantId, amount } = await req.json();
    if (!merchantId || amount == null) {
      return NextResponse.json(
        { error: "merchantId and amount are required" },
        { status: 400 },
      );
    }
    const cardCredentials = await mintScopedCard(merchantId, Number(amount));
    return NextResponse.json({ success: true, cardCredentials });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Card minting failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
