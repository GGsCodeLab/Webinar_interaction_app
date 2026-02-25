"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getSocket } from "@/lib/socket";
import sanitizeHtml from "sanitize-html";

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
  return [m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

type Question = {
  id: number;
  question: string;
  options: string[];
  timerSeconds: number;
};

type Props = {
  question: Question;
  remainingSeconds: number;
  token: string;
  /** Initial counts from server (e.g. from /api/state) so existing votes show immediately */
  initialCounts?: number[];
};

/** Poll only: vote by clicking an option, see live % and counts, pie at end. */
export function PollModal({ question, remainingSeconds, token, initialCounts }: Props) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const selectedOptionRef = useRef<number | null>(null);
  selectedOptionRef.current = selectedOption;
  const [counts, setCounts] = useState<number[]>(() => {
    if (Array.isArray(initialCounts) && initialCounts.length >= question.options.length) {
      return initialCounts.slice(0, question.options.length).map(Number);
    }
    return Array(question.options.length).fill(0);
  });
  const [timeLeft, setTimeLeft] = useState(remainingSeconds);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    setSelectedOption(null);
    if (Array.isArray(initialCounts) && initialCounts.length >= question.options.length) {
      setCounts(initialCounts.slice(0, question.options.length).map(Number));
    } else {
      setCounts(Array(question.options.length).fill(0));
    }
    setTimeLeft(remainingSeconds);
    setEnded(false);

    const socket = getSocket();

    socket.on("timer:tick", ({ remainingSeconds: r }: { remainingSeconds: number }) => {
      setTimeLeft(r);
    });

    socket.on("poll:votes", (data: { questionId: number; counts: number[]; type?: string }) => {
      if (Number(data.questionId) !== Number(question.id)) return;
      if (data.type && data.type !== "poll") return;
      const countsArr = Array.isArray(data.counts) ? data.counts.map(Number) : [];
      setCounts(countsArr.length >= question.options.length ? countsArr : [...countsArr, ...Array(question.options.length - countsArr.length).fill(0)]);
    });

    socket.on("poll:end", (data: { counts: number[]; questionId?: number }) => {
      if (data.questionId != null && Number(data.questionId) !== Number(question.id)) return;
      let nextCounts = Array.isArray(data.counts) ? data.counts.map(Number) : [];
      if (nextCounts.length < question.options.length) {
        nextCounts = [...nextCounts, ...Array(question.options.length - nextCounts.length).fill(0)];
      }
      const myOption = selectedOptionRef.current;
      if (myOption !== null && myOption >= 0 && myOption < nextCounts.length && nextCounts[myOption] === 0) {
        nextCounts = [...nextCounts];
        nextCounts[myOption] = 1;
      }
      setCounts(nextCounts);
      setEnded(true);
    });

    return () => {
      socket.off("timer:tick");
      socket.off("poll:votes");
      socket.off("poll:end");
    };
  }, [question.id, question.options.length]);

  function handleSelectOption(i: number) {
    if (selectedOption !== null || ended) return;
    setSelectedOption(i);
    getSocket().emit("poll:vote", { questionId: question.id, option: i, token, type: "poll" });
  }

  const total = counts.reduce((a, b) => a + b, 0);
  const isUrgent = timeLeft <= 10 && !ended;
  const voted = selectedOption !== null;

  return (
    <Dialog open>
      <DialogContent
        className="max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Poll</DialogTitle>
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div
              className="prose prose-sm flex-1"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(question.question, {
                  allowedTags: sanitizeHtml.defaults.allowedTags,
                }),
              }}
            />
            <span
              className={cn(
                "shrink-0 font-mono text-xl font-bold tabular-nums",
                isUrgent ? "text-destructive animate-pulse" : "text-primary"
              )}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          {question.options.map((opt, i) => {
            const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
            const isSelected = selectedOption === i;

            return (
              <button
                key={i}
                type="button"
                disabled={ended}
                onClick={() => handleSelectOption(i)}
                className={cn(
                  "relative w-full overflow-hidden rounded-lg border px-4 py-3 text-left text-sm transition-all",
                  !ended ? "hover:border-primary hover:bg-primary/5 cursor-pointer" : "cursor-default",
                  isSelected && "border-primary bg-primary/10",
                  voted && isSelected && "border-muted-foreground/40 bg-muted/50",
                  !isSelected && "border-border"
                )}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-lg bg-muted/60 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-muted-foreground">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt}
                    {isSelected && <span className="text-xs text-muted-foreground ml-1">✓ Your vote</span>}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                    {pct}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {ended && (
          <div className="mt-4 space-y-3">
            <p className="text-center text-xs text-muted-foreground">
              Poll ended · {total} response{total !== 1 ? "s" : ""}
            </p>
            {total > 0 && (
              <div className="w-full space-y-2">
                {question.options.map((opt, i) => {
                  const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[75%]">{opt}</span>
                        <span className="text-muted-foreground">{counts[i]} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
