import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { admins } from "@/lib/db/schema";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  // Only allow if no admin exists yet
  const existing = await db.select({ id: admins.id }).from(admins).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "Admin already registered" }, { status: 403 });
  }

  const { name, username, password } = await req.json();

  if (!name?.trim() || !username?.trim() || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(admins).values({
    email: username.trim().toLowerCase(),
    name: name.trim(),
    passwordHash,
  });

  return NextResponse.json({ success: true });
}
