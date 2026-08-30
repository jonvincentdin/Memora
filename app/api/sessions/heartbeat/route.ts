import { NextResponse } from "next/server";
import { requireUserOrNull } from "@/lib/auth/session";

export async function POST() {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Reading the authenticated session runs the JWT callback, which refreshes
  // this browser session's lastSeenAt timestamp at a throttled interval.
  return NextResponse.json({ success: true });
}
