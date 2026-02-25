import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizQuestions, quizResponses } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await db.query.quizQuestions.findFirst({
    where: eq(quizQuestions.id, parseInt(id)),
  });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const counts: number[] = [];
  for (let i = 0; i < (q.options as string[]).length; i++) {
    const res = await db
      .select({ count: sql<number>`count(*)` })
      .from(quizResponses)
      .where(
        sql`${quizResponses.questionId} = ${q.id} AND ${quizResponses.selectedOption} = ${i}`
      );
    counts.push(res[0]?.count ?? 0);
  }

  return NextResponse.json({ ...q, counts });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { question, options, correctOptionIndex, timerSeconds, quizId } = await req.json();

  const [updated] = await db
    .update(quizQuestions)
    .set({
      ...(question !== undefined && { question }),
      ...(options !== undefined && { options }),
      ...(correctOptionIndex !== undefined && { correctOptionIndex }),
      ...(timerSeconds !== undefined && { timerSeconds }),
      ...(quizId !== undefined && { quizId }),
    })
    .where(eq(quizQuestions.id, parseInt(id)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(quizQuestions).where(eq(quizQuestions.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
