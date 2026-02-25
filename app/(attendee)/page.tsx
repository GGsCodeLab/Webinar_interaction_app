"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DinoGame } from "@/components/attendee/DinoGame";
import { PollModal } from "@/components/attendee/PollModal";
import { QuizModal } from "@/components/attendee/QuizModal";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

type AppState =
  | { type: "idle" }
  | { type: "break"; data: { highScore: { name: string; score: number } | null } }
  | {
      type: "poll";
      data: {
        question: { id: number; question: string; options: string[]; timerSeconds: number };
        remainingSeconds: number;
      };
    }
  | {
      type: "quiz";
      data: {
        quizId: number;
        remainingSeconds: number;
        questions: { id: number; question: string; options: string[]; correctOptionIndex?: number }[];
      };
    };

type Attendee = { id: number; name: string; sessionToken: string };

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
}

export default function AttendeePage() {
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [checking, setChecking] = useState(true); // true while verifying cookie
  const [name, setName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>({ type: "idle" });
  const [pollEnded, setPollEnded] = useState(false);
  const [highScore, setHighScore] = useState<{ name: string; score: number } | null>(null);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [contentDocs, setContentDocs] = useState<{ id: number; title: string; slug?: string }[]>([]);
  const [quizLeaderboard, setQuizLeaderboard] = useState<{ rank: number; name: string; score: number }[] | null>(null);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizRemainingSeconds, setQuizRemainingSeconds] = useState<number | null>(null);
  const initialized = useRef(false);

  // Check for existing session cookie before showing anything
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const token = getCookie("attendee_token");
    if (token) {
      fetch("/api/attendees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setAttendee(data);
          connectSocket(data);
        }
        setChecking(false);
      }).catch(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function connectSocket(user: Attendee) {
    const socket = getSocket();

    function syncStateFromApi() {
      fetch("/api/state")
        .then((r) => r.json())
        .then((state) => {
          if (state.type && state.type !== "idle") {
            setAppState(state);
            setQuizLeaderboard(null);
            if (state.type === "quiz") {
              setCurrentQuizIndex(0);
              setQuizRemainingSeconds(state.data?.remainingSeconds ?? null);
            }
          }
        })
        .catch(() => {});
    }

    socket.on("connect", syncStateFromApi);

    socket.emit("attendee:join", { name: user.name, token: user.sessionToken });

    socket.on("user:joined", ({ name }: { name: string }) => {
      if (name !== user.name) {
        toast(`${name} joined`, {
          position: "bottom-right",
          duration: 3000,
        });
      }
    });

    socket.on("state:change", (state: AppState & { data?: { quizLeaderboard?: { rank: number; name: string; score: number }[]; questions?: unknown[] } }) => {
      if (state.type === "quiz" && (!state.data?.questions || state.data.questions.length === 0)) {
        fetch("/api/state").then((r) => r.json()).then((full) => {
          if (full.type === "quiz" && full.data?.questions?.length) {
            setAppState(full);
            setCurrentQuizIndex(0);
            setQuizRemainingSeconds(full.data?.remainingSeconds ?? null);
          } else {
            setAppState(state);
            if (state.type === "quiz") setCurrentQuizIndex(0);
            setQuizRemainingSeconds(state.data?.remainingSeconds ?? null);
          }
          setQuizLeaderboard(null);
        }).catch(() => {
          setAppState(state);
          if (state.type === "quiz") setCurrentQuizIndex(0);
          setQuizRemainingSeconds(state.data?.remainingSeconds ?? null);
          setQuizLeaderboard(null);
        });
        return;
      }
      setAppState(state);
      setPollEnded(false);
      if (state.type === "idle") {
        setQuizLeaderboard(state.data?.quizLeaderboard ?? null);
        setCurrentQuizIndex(0);
        setQuizRemainingSeconds(null);
      } else {
        setQuizLeaderboard(null);
        if (state.type === "quiz") {
          setCurrentQuizIndex(0);
          setQuizRemainingSeconds(state.data?.remainingSeconds ?? null);
        }
        if (state.type === "break" && state.data?.highScore) {
          setHighScore(state.data.highScore);
        }
      }
    });
    socket.on("timer:tick", ({ remainingSeconds }: { remainingSeconds: number }) => {
      setQuizRemainingSeconds(remainingSeconds);
    });

    socket.on("poll:end", () => {
      setPollEnded(true);
    });

    socket.on("score:highscore", (data: { name: string; score: number }) => {
      setHighScore(data);
    });

    socket.on("content:visibility", () => {
      fetch("/api/content/published")
        .then((r) => r.json())
        .then((list) => setContentDocs(Array.isArray(list) ? list : []));
    });

    // Fetch current state from server (quiz state includes questions for self-paced flow)
    syncStateFromApi();

    // Fetch published content for home page links
    fetch("/api/content/published").then((r) => r.json()).then((list) => {
      setContentDocs(Array.isArray(list) ? list : []);
    });
  }

  // Poll DB for total registered users count (public API, every 30s) — not socket
  useEffect(() => {
    function fetchUserCount() {
      fetch("/api/attendees/count")
        .then((r) => r.json())
        .then((data) => {
          if (typeof data?.count === "number") setActiveCount(data.count);
        })
        .catch(() => {});
    }
    fetchUserCount();
    const interval = setInterval(fetchUserCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  // When attendee is logged in and idle, poll /api/state every 4s so we don't miss quiz start (socket can miss the event)
  useEffect(() => {
    if (!attendee || appState.type !== "idle") return;
    const interval = setInterval(() => {
      fetch("/api/state")
        .then((r) => r.json())
        .then((state) => {
          if (state.type && state.type !== "idle") {
            setAppState(state);
            setQuizLeaderboard(null);
            if (state.type === "quiz") {
              setCurrentQuizIndex(0);
              setQuizRemainingSeconds(state.data?.remainingSeconds ?? null);
            }
          }
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [attendee, appState.type]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setRegistering(true);
    setRegisterError(null);

    const res = await fetch("/api/attendees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      const data = await res.json();
      setAttendee(data);
      connectSocket(data);
    } else {
      const body = await res.json().catch(() => ({}));
      setRegisterError(body.error ?? "Registration failed. Please try again.");
    }
    setRegistering(false);
  }

  function handleDinoScore(score: number) {
    if (!attendee) return;
    const socket = getSocket();
    socket.emit("score:submit", { score, token: attendee.sessionToken });
  }

  // Still verifying cookie — show nothing to avoid flash of register form
  if (checking) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!attendee) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
        <div className="mb-8 flex flex-col items-center gap-3">
          <img
            src="https://d157777v0iph40.cloudfront.net/unified3.0/prod/4.5/assets/images/sb_img/favicon.svg"
            alt="R360"
            className="h-16 w-16"
          />
          <h1 className="text-3xl font-bold tracking-tight">AI Bootcamp</h1>
          <p className="text-sm text-muted-foreground">{formatDate(new Date())}</p>
        </div>

        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base">
                  Enter your name to join
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setRegisterError(null); }}
                  placeholder="Your name"
                  autoFocus
                  className={`h-11 text-base ${registerError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {registerError && (
                  <p className="text-sm text-destructive">{registerError}</p>
                )}
              </div>
              <Button type="submit" disabled={registering || !name.trim()} className="w-full h-11 text-base">
                {registering ? "Joining…" : "Join →"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Top Banner */}
      <header className="flex items-center gap-4 border-b bg-background px-6 py-3">
        <img
          src="https://d157777v0iph40.cloudfront.net/unified3.0/prod/4.5/assets/images/sb_img/favicon.svg"
          alt="R360"
          className="h-9 w-9"
        />
        <div className="flex flex-col">
          <span className="text-base font-bold leading-tight">AI Bootcamp</span>
          <span className="text-xs text-muted-foreground">{formatDate(new Date())}</span>
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          <span>{activeCount} {activeCount === 1 ? "user" : "users"}</span>
          <span>Hi, <span className="font-medium text-foreground">{attendee.name}</span></span>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        {appState.type === "idle" && (
          <div className="flex w-full max-w-lg flex-col items-center gap-6 text-center">
            <div className="text-6xl">🎯</div>
            <div>
              <h2 className="text-2xl font-bold">Welcome, {attendee.name}!</h2>
              <p className="mt-2 text-muted-foreground">
                Waiting for the next poll or quiz to start…
              </p>
            </div>
            {contentDocs.length > 0 && (
              <div className="w-full rounded-lg border bg-card p-4 text-left">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Content</h3>
                <ol className="list-inside list-decimal space-y-2 text-foreground">
                  {contentDocs.map((doc) => (
                    <li key={doc.id}>
                      <Link
                        href={`/doc/${doc.slug ?? doc.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {doc.title}
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {appState.type === "break" && (
          <div className="flex w-full flex-col items-center gap-6">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Break Time — Play While You Wait
            </p>
            <DinoGame onScore={handleDinoScore} highScore={highScore} />
          </div>
        )}

        {appState.type === "poll" && (
          <PollModal
            key={appState.data.question.id}
            question={appState.data.question}
            remainingSeconds={appState.data.remainingSeconds}
            token={attendee.sessionToken}
            initialCounts={"counts" in appState.data ? (appState.data as { counts?: number[] }).counts : undefined}
          />
        )}
        {appState.type === "quiz" && appState.data.questions?.length > 0 && currentQuizIndex < appState.data.questions.length && (
          <QuizModal
            key={appState.data.questions[currentQuizIndex].id}
            question={appState.data.questions[currentQuizIndex]}
            remainingSeconds={appState.data.remainingSeconds}
            token={attendee.sessionToken}
            isLastQuestion={currentQuizIndex === appState.data.questions.length - 1}
            onNext={() => setCurrentQuizIndex((i) => i + 1)}
          />
        )}
        {appState.type === "quiz" && appState.data.questions?.length > 0 && currentQuizIndex >= appState.data.questions.length && (
          <div className="flex w-full max-w-lg flex-col items-center gap-4 rounded-lg border bg-card p-6 text-center">
            <p className="text-lg font-medium">Quiz submitted</p>
            <p className="text-sm text-muted-foreground">
              Time remaining: <span className="font-mono font-medium">{Math.max(0, quizRemainingSeconds ?? appState.data.remainingSeconds)}s</span>. Leaderboard will show when time is up.
            </p>
          </div>
        )}
      </main>

      {quizLeaderboard && quizLeaderboard.length > 0 && (
        <Dialog open onOpenChange={(open) => !open && setQuizLeaderboard(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Quiz results — Top 10</DialogTitle>
            </DialogHeader>
            <ol className="list-inside list-decimal space-y-2 border-t pt-4">
              {quizLeaderboard.map((entry) => (
                <li key={entry.rank} className="flex justify-between gap-4 text-sm">
                  <span className="font-medium">{entry.name}</span>
                  <span className="text-muted-foreground">{entry.score} correct</span>
                </li>
              ))}
            </ol>
            <Button className="mt-4 w-full" onClick={() => setQuizLeaderboard(null)}>
              Close
            </Button>
          </DialogContent>
        </Dialog>
      )}

      <Toaster position="bottom-right" />
    </div>
  );
}
