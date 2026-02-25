import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appState, pollQuestions, quizQuestions, quizzes, pollResponses } from "@/lib/db/schema";
import { eq, sql, asc } from "drizzle-orm";

export async function GET() {
  const state = await db.query.appState.findFirst({ where: eq(appState.id, 1) });
  if (!state) return NextResponse.json({ type: "idle", data: {} });

  let data: Record<string, unknown> = {};

  if (state.type === "poll" && state.referenceId) {
    const q = await db.query.pollQuestions.findFirst({
      where: eq(pollQuestions.id, state.referenceId),
    });
    if (q) {
      const elapsed = state.startedAt ? Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 1000) : 0;
      const remainingSeconds = Math.max(0, q.timerSeconds - elapsed);
      const counts: number[] = [];
      for (let i = 0; i < (q.options as string[]).length; i++) {
        const res = await db
          .select({ count: sql<number>`count(*)` })
          .from(pollResponses)
          .where(sql`${pollResponses.questionId} = ${q.id} AND ${pollResponses.selectedOption} = ${i}`);
        counts.push(res[0]?.count ?? 0);
      }
      data = { question: q, counts, remainingSeconds };
    }
  } else if (state.type === "quiz" && state.referenceId) {
    const quizId = state.referenceId;
    const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.id, quizId) });
    if (quiz) {
      const elapsed = state.startedAt ? Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 1000) : 0;
      const remainingSeconds = Math.max(0, (quiz.timerSeconds ?? 60) - elapsed);
      const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId)).orderBy(asc(quizQuestions.id));
      data = { quizId, remainingSeconds, questions };
    }
  }

  return NextResponse.json({ type: state.type, data });
}
