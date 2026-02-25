import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";

export async function GET() {
  const existing = await db.select({ id: admins.id }).from(admins).limit(1);
  return NextResponse.json({ hasAdmin: existing.length > 0 });
}
