import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attendees } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

/** Public route: returns total count of registered attendees (users) in the DB. Poll every 30s for updated count. */
export async function GET() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(attendees);
  return NextResponse.json({ count: Number(count ?? 0) });
}
