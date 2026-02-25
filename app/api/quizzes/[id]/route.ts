import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes, quizQuestions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quizId = parseInt(id);
  if (!Number.isFinite(quizId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let quiz: { id: number; name: string; createdAt: string; timerSeconds?: number } | null = null;
  try {
    const found = await db.query.quizzes.findFirst({ where: eq(quizzes.id, quizId) });
    quiz = found ?? null;
  } catch {
    const row = await db
      .select({ id: quizzes.id, name: quizzes.name, createdAt: quizzes.createdAt })
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);
    if (row[0]) quiz = { ...row[0], timerSeconds: 60 };
  }
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const quizWithTimer = { ...quiz, timerSeconds: quiz.timerSeconds ?? 60 };

  const questions = await db
    .select({
      id: quizQuestions.id,
      pollId: quizQuestions.pollId,
      question: quizQuestions.question,
      correctOptionIndex: quizQuestions.correctOptionIndex,
      createdAt: quizQuestions.createdAt,
      responseCount: sql<number>`(select count(*) from quiz_responses where quiz_responses.question_id = ${quizQuestions.id})`,
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(quizQuestions.createdAt);

  return NextResponse.json({ quiz: quizWithTimer, questions });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // #region agent log
  fetch('http://127.0.0.1:7523/ingest/43ddd7c9-3919-4c29-9a73-6ac98841197b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5e64c'},body:JSON.stringify({sessionId:'b5e64c',location:'quizzes/[id]/route.ts:PATCH:entry',message:'PATCH entry',data:{},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  let session;
  try {
    session = await auth();
  } catch (authErr) {
    // #region agent log
    fetch('http://127.0.0.1:7523/ingest/43ddd7c9-3919-4c29-9a73-6ac98841197b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5e64c'},body:JSON.stringify({sessionId:'b5e64c',location:'quizzes/[id]/route.ts:PATCH:authCatch',message:'auth() threw',data:{err: String(authErr)},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw authErr;
  }
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const quizId = parseInt(id);
  // #region agent log
  fetch('http://127.0.0.1:7523/ingest/43ddd7c9-3919-4c29-9a73-6ac98841197b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5e64c'},body:JSON.stringify({sessionId:'b5e64c',location:'quizzes/[id]/route.ts:PATCH:params',message:'params and quizId',data:{id,quizId},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  let quiz;
  try {
    quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.id, quizId) });
  } catch (findErr) {
    // #region agent log
    fetch('http://127.0.0.1:7523/ingest/43ddd7c9-3919-4c29-9a73-6ac98841197b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5e64c'},body:JSON.stringify({sessionId:'b5e64c',location:'quizzes/[id]/route.ts:PATCH:findCatch',message:'findFirst threw',data:{err: String(findErr)},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    throw findErr;
  }
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body;
  try {
    body = await req.json();
  } catch (jsonErr) {
    // #region agent log
    fetch('http://127.0.0.1:7523/ingest/43ddd7c9-3919-4c29-9a73-6ac98841197b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5e64c'},body:JSON.stringify({sessionId:'b5e64c',location:'quizzes/[id]/route.ts:PATCH:jsonCatch',message:'req.json() threw',data:{err: String(jsonErr)},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw jsonErr;
  }
  const updates: { name?: string; timerSeconds?: number } = {};
  if (body.name !== undefined && typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (body.timerSeconds !== undefined && typeof body.timerSeconds === "number" && body.timerSeconds >= 60 && body.timerSeconds <= 7200)
    updates.timerSeconds = body.timerSeconds;

  // #region agent log
  fetch('http://127.0.0.1:7523/ingest/43ddd7c9-3919-4c29-9a73-6ac98841197b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5e64c'},body:JSON.stringify({sessionId:'b5e64c',location:'quizzes/[id]/route.ts:PATCH:updates',message:'updates built',data:{bodyKeys:Object.keys(body),updates,updateKeys:Object.keys(updates)},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  if (Object.keys(updates).length === 0) return NextResponse.json(quiz);

  try {
    const [updated] = await db.update(quizzes).set(updates).where(eq(quizzes.id, quizId)).returning();
    // #region agent log
    fetch('http://127.0.0.1:7523/ingest/43ddd7c9-3919-4c29-9a73-6ac98841197b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5e64c'},body:JSON.stringify({sessionId:'b5e64c',location:'quizzes/[id]/route.ts:PATCH:updateOk',message:'db.update succeeded',data:{hasUpdated:!!updated},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return NextResponse.json(updated ?? quiz);
  } catch (updateErr) {
    // #region agent log
    fetch('http://127.0.0.1:7523/ingest/43ddd7c9-3919-4c29-9a73-6ac98841197b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5e64c'},body:JSON.stringify({sessionId:'b5e64c',location:'quizzes/[id]/route.ts:PATCH:updateCatch',message:'db.update threw',data:{err: String(updateErr)},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    throw updateErr;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(quizzes).where(eq(quizzes.id, parseInt(id)));
  return NextResponse.json({ success: true });
}
