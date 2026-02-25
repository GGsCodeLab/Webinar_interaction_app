"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Play, Square, Trophy, Trash2 } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

type Question = {
  id: number;
  pollId: string;
  question: string;
  responseCount: number;
  correctOptionIndex: number;
};

type Quiz = { id: number; name: string; timerSeconds: number };
type LiveState = { type: string; referenceId: number | null; remainingSeconds?: number } | null;
type LeaderboardEntry = { rank: number; name: string; score: number };

export default function QuizDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveState, setLiveState] = useState<LiveState>(null);
  const [timerEdit, setTimerEdit] = useState<string>("");
  const [savingTimer, setSavingTimer] = useState(false);
  const [quizLeaderboard, setQuizLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/quizzes/${id}`);
      const data = await res.json();
      if (res.ok && data.quiz) {
        setQuiz({ ...data.quiz, timerSeconds: data.quiz.timerSeconds ?? 60 });
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
      } else {
        setQuiz(null);
        setQuestions([]);
        if (res.status === 404) toast.error("Quiz not found");
        else if (!res.ok) toast.error("Failed to load quiz");
      }
    } catch {
      setQuiz(null);
      setQuestions([]);
      toast.error("Failed to load quiz");
    } finally {
      setLoading(false);
    }
  }

  async function loadState() {
    const res = await fetch("/api/state");
    if (!res.ok) return;
    const data = await res.json();
    if (data.type === "quiz" && data.data?.quizId != null && data.data?.remainingSeconds != null)
      setLiveState({ type: "quiz", referenceId: data.data.quizId, remainingSeconds: data.data.remainingSeconds });
    else setLiveState(null);
  }

  useEffect(() => { load(); }, [id]);
  useEffect(() => { loadState(); }, [id]);

  useEffect(() => {
    const socket = getSocket();
    socket.on("state:change", (s: {
      type: string;
      data?: { quizId?: number; remainingSeconds?: number; quizLeaderboard?: LeaderboardEntry[] };
    }) => {
      if (s.type === "quiz" && s.data?.quizId != null)
        setLiveState({ type: "quiz", referenceId: s.data.quizId, remainingSeconds: s.data.remainingSeconds ?? 0 });
      else if (s.type === "idle") {
        setLiveState(null);
        if (s.data?.quizLeaderboard?.length) setQuizLeaderboard(s.data.quizLeaderboard);
        else setQuizLeaderboard(null);
      }
    });
    socket.on("timer:tick", ({ remainingSeconds }: { remainingSeconds: number }) => {
      setLiveState((prev) => (prev?.type === "quiz" ? { ...prev, remainingSeconds } : prev));
    });
    return () => { socket.off("state:change"); socket.off("timer:tick"); };
  }, []);

  function handleStartQuiz() {
    const quizId = id != null ? Number(id) : NaN;
    if (!Number.isFinite(quizId)) {
      toast.error("Invalid quiz");
      return;
    }
    const socket = getSocket();
    if (!socket.connected) {
      toast.error("Not connected. Refresh the page and try again.");
      return;
    }
    socket.emit("admin:startQuiz", { quizId });
    toast.success("Starting quiz…");
    loadState();
  }

  function handleEndQuiz() {
    getSocket().emit("admin:setIdle");
    setLiveState(null);
    toast.success("Quiz ended");
    load();
  }

  async function handleDeleteQuestion(q: Question) {
    if (!confirm(`Delete this quiz question? This cannot be undone.`)) return;
    setDeletingId(q.id);
    const res = await fetch(`/api/quiz/${q.id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      toast.success("Question deleted");
      load();
    } else {
      toast.error("Failed to delete question");
    }
  }

  const quizIsLive = liveState?.type === "quiz" && liveState.referenceId === Number(id);

  async function handleSaveTimer() {
    const val = parseInt(timerEdit, 10);
    if (!Number.isFinite(val) || val < 60 || val > 7200) {
      toast.error("Total time must be between 60 and 7200 seconds (1 min – 2 hours)");
      return;
    }
    setSavingTimer(true);
    try {
      const res = await fetch(`/api/quizzes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timerSeconds: val }) });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setQuiz((prev) => (prev ? { ...prev, timerSeconds: updated.timerSeconds } : null));
      setTimerEdit("");
      toast.success("Total time updated");
    } catch {
      toast.error("Failed to update quiz timer");
    } finally {
      setSavingTimer(false);
    }
  }

  function stripHtml(html: string) {
    return html.replace(/<[^>]+>/g, "").slice(0, 80);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/quizzes" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Quizzes
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{quiz?.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{quiz?.name ?? "Loading…"}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {questions.length} questions · Total time: {(quiz?.timerSeconds ?? 60)}s
            </p>
            {quiz && (
              <div className="flex items-center gap-2">
                <Label htmlFor="quiz-timer" className="text-xs text-muted-foreground sr-only">Total time (seconds)</Label>
                <Input
                  id="quiz-timer"
                  type="number"
                  min={60}
                  max={7200}
                  placeholder={`${quiz.timerSeconds}`}
                  value={timerEdit || ""}
                  onChange={(e) => setTimerEdit(e.target.value)}
                  className="w-20 h-8 text-sm"
                />
                <Button variant="outline" size="sm" onClick={handleSaveTimer} disabled={savingTimer || !timerEdit.trim()}>
                  {savingTimer ? "Saving…" : "Update timer"}
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!quizIsLive && questions.length > 0 && (
            <Button onClick={handleStartQuiz}>
              <Play className="mr-2 h-4 w-4" />Start quiz
            </Button>
          )}
          <Link href={`/admin/quizzes/${id}/add-questions`}>
            <Button variant="outline"><Plus className="mr-2 h-4 w-4" />Add questions</Button>
          </Link>
          <Link href={`/admin/quiz-questions/create?quizId=${id}`}>
            <Button variant="ghost" size="sm" className="text-muted-foreground">Add one</Button>
          </Link>
        </div>
      </div>

      {quizIsLive && (
        <div className="flex items-center justify-between rounded-lg border border-primary/50 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium">
            Quiz in progress · {liveState.remainingSeconds != null ? `${liveState.remainingSeconds}s remaining` : "—"}
          </span>
          <Button variant="outline" size="sm" onClick={handleEndQuiz}>
            <Square className="mr-1 h-3 w-3" />
            End quiz
          </Button>
        </div>
      )}

      {!quizIsLive && (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No</TableHead>
                <TableHead>Quiz Question</TableHead>
                <TableHead className="w-28 text-center">Responses</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="py-12 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : questions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                    No questions yet. <Link href={`/admin/quizzes/${id}/add-questions`} className="underline">Add questions</Link>
                  </TableCell>
                </TableRow>
              ) : (
                questions.map((q, idx) => (
                  <TableRow key={q.id} className="group">
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <Link href={`/admin/quiz-questions/${q.id}`} className="font-medium hover:underline">
                        {stripHtml(q.question) || "Untitled"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center font-medium">{q.responseCount}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={deletingId === q.id}
                        onClick={() => handleDeleteQuestion(q)}
                        title="Delete question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {quizLeaderboard && quizLeaderboard.length > 0 && (
        <Dialog open onOpenChange={(open) => !open && setQuizLeaderboard(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Quiz results — Top 10
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-1 py-2">
              {quizLeaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-medium text-muted-foreground">#{entry.rank}</span>
                  <span className="font-medium">{entry.name}</span>
                  <span className="font-semibold tabular-nums">{entry.score} pts</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setQuizLeaderboard(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <Toaster />
    </div>
  );
}
