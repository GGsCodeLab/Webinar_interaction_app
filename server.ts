import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { db } from "./lib/db";
import { appState, pollQuestions, quizQuestions, quizzes, pollResponses, quizResponses, attendees, gameScores } from "./lib/db/schema";
import { eq, sql, asc, inArray } from "drizzle-orm";

const dev = process.env.NODE_ENV !== "production";
const hostname = dev ? "localhost" : "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let activeTimer: ReturnType<typeof setInterval> | null = null;
let currentTimerSeconds = 0;

function now() {
  return new Date().toISOString();
}

async function getVoteCounts(
  table: typeof pollResponses | typeof quizResponses,
  questionId: number,
  optionCount: number
): Promise<number[]> {
  const counts: number[] = [];
  for (let i = 0; i < optionCount; i++) {
    const res = await db
      .select({ count: sql<number>`count(*)` })
      .from(table)
      .where(sql`${table.questionId} = ${questionId} AND ${table.selectedOption} = ${i}`);
    counts.push(Number(res[0]?.count ?? 0));
  }
  return counts;
}

async function getQuizLeaderboard(lastQuestionId: number, limit: number): Promise<{ rank: number; name: string; score: number }[]> {
  const lastQ = await db.query.quizQuestions.findFirst({ where: eq(quizQuestions.id, lastQuestionId) });
  if (!lastQ?.quizId) return [];
  return getQuizLeaderboardByQuizId(lastQ.quizId, limit);
}

async function getQuizLeaderboardByQuizId(quizId: number, limit: number): Promise<{ rank: number; name: string; score: number }[]> {
  const all = await db.select({ id: quizQuestions.id }).from(quizQuestions).where(eq(quizQuestions.quizId, quizId)).orderBy(asc(quizQuestions.id));
  const questionIds = all.map((r) => r.id);
  if (questionIds.length === 0) return [];

  const responses = await db
    .select({ attendeeId: quizResponses.attendeeId, isCorrect: quizResponses.isCorrect })
    .from(quizResponses)
    .where(inArray(quizResponses.questionId, questionIds));

  const scoreByAttendee = new Map<number, number>();
  for (const r of responses) {
    const s = scoreByAttendee.get(r.attendeeId) ?? 0;
    scoreByAttendee.set(r.attendeeId, s + (r.isCorrect ? 1 : 0));
  }
  const sorted = [...scoreByAttendee.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);

  const leaderboard: { rank: number; name: string; score: number }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const attendee = await db.query.attendees.findFirst({ where: eq(attendees.id, sorted[i][0]) });
    leaderboard.push({ rank: i + 1, name: attendee?.name ?? "Unknown", score: sorted[i][1] });
  }
  return leaderboard;
}

async function getQuizTimerSeconds(quizId: number): Promise<number> {
  const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.id, quizId) });
  return quiz?.timerSeconds ?? 60;
}

async function broadcastCurrentState(io: SocketIOServer) {
  try {
    const state = await db.query.appState.findFirst({ where: eq(appState.id, 1) });
    if (!state) return;

    let data: Record<string, unknown> = {};

    if (state.type === "poll" && state.referenceId) {
      const q = await db.query.pollQuestions.findFirst({ where: eq(pollQuestions.id, state.referenceId) });
      if (q) data = { question: q, remainingSeconds: currentTimerSeconds };
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

    io.emit("state:change", { type: state.type, data });
  } catch (err) {
    console.error("broadcastCurrentState error:", err);
  }
}

function stopActiveTimer() {
  if (activeTimer) { clearInterval(activeTimer); activeTimer = null; }
  currentTimerSeconds = 0;
}

async function startQuizTimer(io: SocketIOServer, quizId: number, timerSeconds: number) {
  stopActiveTimer();
  currentTimerSeconds = timerSeconds;

  activeTimer = setInterval(async () => {
    currentTimerSeconds--;
    io.emit("timer:tick", { remainingSeconds: currentTimerSeconds });

    if (currentTimerSeconds <= 0) {
      stopActiveTimer();
      await db.update(appState).set({ type: "idle", referenceId: null }).where(eq(appState.id, 1));
      const leaderboard = await getQuizLeaderboardByQuizId(quizId, 10);
      io.emit("state:change", { type: "idle", data: { quizLeaderboard: leaderboard } });
    }
  }, 1000);
}

async function startPollTimer(io: SocketIOServer, questionId: number, timerSeconds: number, type: "poll") {
  stopActiveTimer();
  currentTimerSeconds = timerSeconds;

  activeTimer = setInterval(async () => {
    currentTimerSeconds--;
    io.emit("timer:tick", { remainingSeconds: currentTimerSeconds });

    if (currentTimerSeconds <= 0) {
      stopActiveTimer();

      await new Promise((r) => setTimeout(r, 150));

      let counts: number[] = [];
      const q = await db.query.pollQuestions.findFirst({ where: eq(pollQuestions.id, questionId) });
      if (q) counts = await getVoteCounts(pollResponses, questionId, (q.options as string[]).length);
      io.emit("poll:end", { counts, type, questionId });

      await db.update(appState).set({ type: "idle", referenceId: null }).where(eq(appState.id, 1));
      io.emit("state:change", { type: "idle", data: {} });
    }
  }, 1000);
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url!, true);
    await handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  (global as Record<string, unknown>).io = io;

  const activeAttendeeIds = new Set<string>();

  function broadcastActiveCount() {
    io.emit("users:active", { count: activeAttendeeIds.size });
  }

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    broadcastCurrentState(io);

    socket.on("attendee:join", async ({ name, token }: { name: string; token: string }) => {
      try {
        const attendee = await db.query.attendees.findFirst({ where: eq(attendees.sessionToken, token) });
        if (attendee) {
          activeAttendeeIds.add(socket.id);
          const count = activeAttendeeIds.size;
          io.emit("users:active", { count });
          socket.emit("users:active", { count });
          io.emit("user:joined", { name: attendee.name });
          broadcastCurrentState(io);
        }
      } catch (err) { console.error("attendee:join error:", err); }
    });

    socket.on("poll:vote", async ({ questionId, option, token, type }: { questionId: number; option: number; token: string; type: "poll" | "quiz" }) => {
      try {
        const attendee = await db.query.attendees.findFirst({ where: eq(attendees.sessionToken, token) });
        if (!attendee) return;

        if (type === "poll") {
          const existing = await db.query.pollResponses.findFirst({
            where: sql`${pollResponses.questionId} = ${questionId} AND ${pollResponses.attendeeId} = ${attendee.id}`,
          });
          if (existing) return;
          await db.insert(pollResponses).values({ questionId, attendeeId: attendee.id, selectedOption: option });
        } else {
          const existing = await db.query.quizResponses.findFirst({
            where: sql`${quizResponses.questionId} = ${questionId} AND ${quizResponses.attendeeId} = ${attendee.id}`,
          });
          if (existing) return;
          const q = await db.query.quizQuestions.findFirst({ where: eq(quizQuestions.id, questionId) });
          const isCorrect = q ? q.correctOptionIndex === option : false;
          await db.insert(quizResponses).values({ questionId, attendeeId: attendee.id, selectedOption: option, isCorrect });
        }

        const table = type === "poll" ? pollResponses : quizResponses;
        const q = type === "poll"
          ? await db.query.pollQuestions.findFirst({ where: eq(pollQuestions.id, questionId) })
          : await db.query.quizQuestions.findFirst({ where: eq(quizQuestions.id, questionId) });

        if (q) {
          const counts = await getVoteCounts(table, questionId, (q.options as string[]).length);
          io.emit("poll:votes", { questionId, counts, type });
        }
      } catch (err) { console.error("poll:vote error:", err); }
    });

    socket.on("score:submit", async ({ score, token }: { score: number; token: string }) => {
      try {
        const attendee = await db.query.attendees.findFirst({ where: eq(attendees.sessionToken, token) });
        if (!attendee) return;
        await db.insert(gameScores).values({ attendeeId: attendee.id, score });

        const highScoreRes = await db
          .select({ score: gameScores.score, name: attendees.name })
          .from(gameScores)
          .innerJoin(attendees, eq(gameScores.attendeeId, attendees.id))
          .orderBy(sql`${gameScores.score} DESC`)
          .limit(1);

        if (highScoreRes.length > 0) {
          io.emit("score:highscore", { name: highScoreRes[0].name, score: highScoreRes[0].score });
        }
      } catch (err) { console.error("score:submit error:", err); }
    });

    socket.on("admin:startPoll", async ({ questionId }: { questionId: number }) => {
      try {
        const q = await db.query.pollQuestions.findFirst({ where: eq(pollQuestions.id, questionId) });
        if (!q) return;

        await db.insert(appState)
          .values({ id: 1, type: "poll", referenceId: questionId, startedAt: now() })
          .onConflictDoUpdate({ target: appState.id, set: { type: "poll", referenceId: questionId, startedAt: now() } });

        const timerSeconds = (q as { timerSeconds: number }).timerSeconds ?? 60;
        currentTimerSeconds = timerSeconds;
        io.emit("state:change", { type: "poll", data: { question: q, remainingSeconds: timerSeconds } });
        await startPollTimer(io, questionId, timerSeconds, "poll");
      } catch (err) { console.error("admin:startPoll error:", err); }
    });

    socket.on("admin:startQuiz", async ({ quizId }: { quizId: number }) => {
      try {
        if (quizId == null || !Number.isFinite(quizId)) return;
        const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.id, quizId) });
        if (!quiz) return;

        const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId)).orderBy(asc(quizQuestions.id));
        if (questions.length === 0) return;

        await db.insert(appState)
          .values({ id: 1, type: "quiz", referenceId: quizId, startedAt: now() })
          .onConflictDoUpdate({ target: appState.id, set: { type: "quiz", referenceId: quizId, startedAt: now() } });

        const timerSeconds = quiz.timerSeconds ?? 60;
        currentTimerSeconds = timerSeconds;
        io.emit("state:change", { type: "quiz", data: { quizId, remainingSeconds: timerSeconds, questions } });
        await startQuizTimer(io, quizId, timerSeconds);
      } catch (err) { console.error("admin:startQuiz error:", err); }
    });

    socket.on("admin:startBreak", async () => {
      try {
        stopActiveTimer();
        await db.insert(appState)
          .values({ id: 1, type: "break", referenceId: null, startedAt: now() })
          .onConflictDoUpdate({ target: appState.id, set: { type: "break", referenceId: null, startedAt: now() } });

        const highScoreRes = await db
          .select({ score: gameScores.score, name: attendees.name })
          .from(gameScores)
          .innerJoin(attendees, eq(gameScores.attendeeId, attendees.id))
          .orderBy(sql`${gameScores.score} DESC`)
          .limit(1);

        io.emit("state:change", { type: "break", data: { highScore: highScoreRes[0] ?? null } });
      } catch (err) { console.error("admin:startBreak error:", err); }
    });

    socket.on("admin:setIdle", async () => {
      try {
        const state = await db.query.appState.findFirst({ where: eq(appState.id, 1) });
        const wasQuiz = state?.type === "quiz" && state.referenceId != null;
        const quizId = wasQuiz ? state!.referenceId! : null;

        stopActiveTimer();
        await db.insert(appState)
          .values({ id: 1, type: "idle", referenceId: null, startedAt: now() })
          .onConflictDoUpdate({ target: appState.id, set: { type: "idle", referenceId: null, startedAt: now() } });

        if (quizId != null) {
          const leaderboard = await getQuizLeaderboardByQuizId(quizId, 10);
          io.emit("state:change", { type: "idle", data: { quizLeaderboard: leaderboard } });
        } else {
          io.emit("state:change", { type: "idle", data: {} });
        }
      } catch (err) { console.error("admin:setIdle error:", err); }
    });

    socket.on("admin:nextQuestion", async () => {
      // No-op for quiz: quiz is self-paced, no admin-driven next question
    });

    socket.on("disconnect", () => {
      activeAttendeeIds.delete(socket.id);
      broadcastActiveCount();
      console.log("Client disconnected:", socket.id);
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
