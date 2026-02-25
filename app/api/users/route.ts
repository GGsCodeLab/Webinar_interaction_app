import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attendees, gameScores, quizResponses } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await db
    .select({
      id: attendees.id,
      name: attendees.name,
      createdAt: attendees.createdAt,
      highScore: sql<number>`coalesce(max(${gameScores.score}), 0)`,
    })
    .from(attendees)
    .leftJoin(gameScores, eq(gameScores.attendeeId, attendees.id))
    .groupBy(attendees.id)
    .orderBy(attendees.createdAt);

  const quizScores = await db
    .select({
      attendeeId: quizResponses.attendeeId,
      quizScore: sql<number>`sum(${quizResponses.isCorrect})`,
    })
    .from(quizResponses)
    .groupBy(quizResponses.attendeeId);

  const scoreByAttendee = new Map(quizScores.map((r) => [r.attendeeId, Number(r.quizScore ?? 0)]));

  const usersWithQuiz = users.map((u) => ({
    ...u,
    quizScore: scoreByAttendee.get(u.id) ?? 0,
  }));

  return NextResponse.json(usersWithQuiz);
}
