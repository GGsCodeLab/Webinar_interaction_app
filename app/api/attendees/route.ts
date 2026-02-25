import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attendees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await db.select().from(attendees).orderBy(attendees.createdAt);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  // Check for duplicate name (case-insensitive)
  const existing = await db.query.attendees.findFirst({
    where: eq(attendees.name, name.trim()),
  });
  if (existing) {
    return NextResponse.json({ error: "Username already taken. Please choose a different name." }, { status: 409 });
  }

  const sessionToken = randomUUID();
  const [attendee] = await db
    .insert(attendees)
    .values({ name: name.trim(), sessionToken })
    .returning();

  const response = NextResponse.json(attendee, { status: 201 });
  response.cookies.set("attendee_token", sessionToken, {
    httpOnly: false, // must be readable by client-side JS for session restoration
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
    sameSite: "lax",
  });
  return response;
}

// Verify session token
export async function PUT(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const attendee = await db.query.attendees.findFirst({
    where: eq(attendees.sessionToken, token),
  });

  if (!attendee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(attendee);
}
