import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pollQuestions } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topicId, question, options, timerSeconds } = await req.json();

  if (!topicId || !question || !options || options.length < 4 || options.length > 6) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  let pollId = nanoid();
  // Ensure unique
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.query.pollQuestions.findFirst({
      where: (q, { eq }) => eq(q.pollId, pollId),
    });
    if (!existing) break;
    pollId = nanoid();
    attempts++;
  }

  const [q] = await db
    .insert(pollQuestions)
    .values({ pollId, topicId, question, options, timerSeconds: timerSeconds ?? 60 })
    .returning();

  return NextResponse.json(q, { status: 201 });
}
