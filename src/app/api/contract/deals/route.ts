import { NextResponse } from "next/server";
import { getAllDeals } from "@/lib/deals";

export async function GET() {
  try {
    return NextResponse.json(getAllDeals());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list deals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
