import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pollQuestions, pollResponses } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await db.query.pollQuestions.findFirst({
    where: eq(pollQuestions.id, parseInt(id)),
  });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const counts: number[] = [];
  for (let i = 0; i < (q.options as string[]).length; i++) {
    const res = await db
      .select({ count: sql<number>`count(*)` })
      .from(pollResponses)
      .where(
        sql`${pollResponses.questionId} = ${q.id} AND ${pollResponses.selectedOption} = ${i}`
      );
    counts.push(res[0]?.count ?? 0);
  }

  return NextResponse.json({ ...q, counts });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { question, options, timerSeconds, topicId } = await req.json();

  const [updated] = await db
    .update(pollQuestions)
    .set({
      ...(question !== undefined && { question }),
      ...(options !== undefined && { options }),
      ...(timerSeconds !== undefined && { timerSeconds }),
      ...(topicId !== undefined && { topicId }),
    })
    .where(eq(pollQuestions.id, parseInt(id)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(pollQuestions).where(eq(pollQuestions.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
