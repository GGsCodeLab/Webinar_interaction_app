import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { topics, pollQuestions, pollResponses } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topic = await db.query.topics.findFirst({ where: eq(topics.id, parseInt(id)) });
  if (!topic) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const topicIdNum = parseInt(id);
  const questionsRows = await db
    .select({
      id: pollQuestions.id,
      pollId: pollQuestions.pollId,
      question: pollQuestions.question,
      timerSeconds: pollQuestions.timerSeconds,
      createdAt: pollQuestions.createdAt,
    })
    .from(pollQuestions)
    .where(eq(pollQuestions.topicId, topicIdNum))
    .orderBy(pollQuestions.createdAt);

  const questions = await Promise.all(
    questionsRows.map(async (q) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(pollResponses)
        .where(eq(pollResponses.questionId, q.id));
      return { ...q, responseCount: Number(count ?? 0) };
    })
  );

  return NextResponse.json({ topic, questions });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(topics).where(eq(topics.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
