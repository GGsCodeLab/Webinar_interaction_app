import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const all = await db
      .select({
        id: quizzes.id,
        name: quizzes.name,
        createdAt: quizzes.createdAt,
      })
      .from(quizzes)
      .orderBy(quizzes.createdAt);
    return NextResponse.json(all);
  } catch (err) {
    console.error("GET /api/quizzes error:", err);
    return NextResponse.json({ error: "Failed to list quizzes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch (err) {
    console.error("POST /api/quizzes auth error:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; timerSeconds?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const timerSeconds =
    body.timerSeconds != null && Number.isFinite(body.timerSeconds) && body.timerSeconds >= 60 && body.timerSeconds <= 7200
      ? body.timerSeconds
      : 60;

  try {
    const [quiz] = await db
      .insert(quizzes)
      .values({ name, timerSeconds })
      .returning();
    if (!quiz) return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 });
    return NextResponse.json(quiz, { status: 201 });
  } catch (err) {
    console.error("POST /api/quizzes insert error:", err);
    return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 });
  }
}
