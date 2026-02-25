"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Play, Square, Trash2 } from "lucide-react";
import { StartNowDialog } from "@/components/admin/StartNowDialog";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";

type Question = {
  id: number;
  pollId: string;
  question: string;
  timerSeconds: number;
  responseCount: number;
};

type Topic = { id: number; name: string };

type ActivePoll = {
  questionId: number;
  questionText: string;
  options: string[];
  timerSeconds: number;
  /** When set, show results from DB only (view), do not start poll */
  initialCounts?: number[];
};

type LiveState = { type: string; referenceId: number | null; remainingSeconds?: number } | null;

export default function TopicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePoll, setActivePoll] = useState<ActivePoll | null>(null);
  const [liveState, setLiveState] = useState<LiveState>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load() {
    const res = await fetch(`/api/topics/${id}`);
    if (res.ok) {
      const data = await res.json();
      setTopic(data.topic);
      setQuestions(data.questions);
    }
    setLoading(false);
  }

  async function loadState() {
    const res = await fetch("/api/state");
    if (!res.ok) return;
    const data = await res.json();
    if (data.type === "poll" && data.data?.question && data.data?.remainingSeconds != null)
      setLiveState({ type: "poll", referenceId: data.data.question.id, remainingSeconds: data.data.remainingSeconds });
    else setLiveState(null);
  }

  useEffect(() => { load(); }, [id]);
  useEffect(() => { loadState(); }, [id]);

  useEffect(() => {
    const socket = getSocket();
    socket.on("state:change", (s: { type: string; data?: { question?: { id: number }; remainingSeconds?: number } }) => {
      if (s.type === "poll" && s.data?.question)
        setLiveState({ type: "poll", referenceId: s.data.question.id, remainingSeconds: s.data.remainingSeconds ?? 0 });
      else if (s.type === "idle") setLiveState(null);
    });
    socket.on("timer:tick", ({ remainingSeconds }: { remainingSeconds: number }) => {
      setLiveState((prev) => (prev?.type === "poll" ? { ...prev, remainingSeconds } : prev));
    });
    return () => { socket.off("state:change"); socket.off("timer:tick"); };
  }, []);

  async function handleStartNow(q: Question) {
    const res = await fetch(`/api/polls/${q.id}`);
    if (!res.ok) { toast.error("Failed to load question"); return; }
    const data = await res.json();
    setActivePoll({
      questionId: q.id,
      questionText: q.question,
      options: data.options as string[],
      timerSeconds: q.timerSeconds,
    });
  }

  async function handleViewResults(q: Question) {
    const res = await fetch(`/api/polls/${q.id}`);
    if (!res.ok) { toast.error("Failed to load results"); return; }
    const data = await res.json();
    const counts = Array.isArray(data.counts) ? data.counts : [];
    setActivePoll({
      questionId: q.id,
      questionText: q.question,
      options: (data.options ?? []) as string[],
      timerSeconds: q.timerSeconds,
      initialCounts: counts,
    });
  }

  function handleEndPoll() {
    getSocket().emit("admin:setIdle");
    setLiveState(null);
    setActivePoll(null);
    toast.success("Poll ended");
    load();
  }

  async function handleDeleteQuestion(q: Question) {
    if (!confirm(`Delete this poll question? This cannot be undone.`)) return;
    setDeletingId(q.id);
    const res = await fetch(`/api/polls/${q.id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      toast.success("Question deleted");
      load();
    } else {
      toast.error("Failed to delete question");
    }
  }

  function stripHtml(html: string) {
    return html.replace(/<[^>]+>/g, "").slice(0, 80) + (html.length > 80 ? "…" : "");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/topics" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Polls
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{topic?.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{topic?.name ?? "Loading…"}</h1>
          <p className="text-sm text-muted-foreground">{questions.length} questions</p>
        </div>
        <Link href={`/admin/questions/create?topicId=${id}`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Question
          </Button>
        </Link>
      </div>

      {liveState?.type === "poll" && liveState.referenceId != null && questions.some((q) => q.id === liveState!.referenceId) && (
        <div className="flex items-center justify-between rounded-lg border border-primary/50 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium">
            Poll live · question running ({liveState.remainingSeconds != null ? `${liveState.remainingSeconds}s left` : "—"})
          </span>
          <Button variant="outline" size="sm" onClick={handleEndPoll}>
            <Square className="mr-1 h-3 w-3" />
            End poll
          </Button>
        </div>
      )}

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">S.No</TableHead>
              <TableHead>Poll Question</TableHead>
              <TableHead className="w-24 text-center">Time</TableHead>
              <TableHead className="w-28 text-center">Responses</TableHead>
              <TableHead className="w-32 text-center">Action</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : questions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No questions yet.{" "}
                  <Link href={`/admin/questions/create?topicId=${id}`} className="underline">
                    Add one
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              questions.map((q, idx) => (
                <TableRow key={q.id}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/questions/${q.id}`}
                      className="font-medium hover:underline"
                    >
                      {stripHtml(q.question) || "Untitled"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{q.timerSeconds}s</Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {q.responseCount}
                  </TableCell>
                  <TableCell className="text-center">
                    {liveState?.type === "poll" && liveState.referenceId === q.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <Badge variant="default">Live</Badge>
                        <Button size="sm" variant="ghost" onClick={() => handleStartNow(q)}>View</Button>
                      </div>
                    ) : q.responseCount > 0 ? (
                      <Button size="sm" variant="outline" onClick={() => handleViewResults(q)}>
                        View
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleStartNow(q)}>
                        <Play className="mr-1 h-3 w-3" />
                        Start Now
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
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

      {activePoll && (
        <StartNowDialog
          open={!!activePoll}
          onClose={() => { setActivePoll(null); load(); loadState(); }}
          questionId={activePoll.questionId}
          questionText={activePoll.questionText}
          options={activePoll.options}
          timerSeconds={activePoll.timerSeconds}
          type="poll"
          alreadyLive={liveState?.type === "poll" && liveState.referenceId === activePoll.questionId}
          initialRemainingSeconds={liveState?.type === "poll" && liveState.referenceId === activePoll.questionId ? liveState.remainingSeconds : undefined}
          initialCounts={activePoll.initialCounts}
        />
      )}
    </div>
  );
}
