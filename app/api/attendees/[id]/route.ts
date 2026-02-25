import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attendees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(attendees).where(eq(attendees.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
