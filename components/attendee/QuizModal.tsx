"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  timerSeconds?: number;
};

type Props = {
  question: Question;
  remainingSeconds: number;
  token: string;
  isLastQuestion?: boolean;
  onNext?: () => void;
};

/** Quiz only: select option then Submit; on submit go to next question or finish (self-paced). */
export function QuizModal({ question, remainingSeconds, token, isLastQuestion = false, onNext }: Props) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [counts, setCounts] = useState<number[]>(Array(question.options.length).fill(0));
  const [timeLeft, setTimeLeft] = useState(remainingSeconds);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    setSelectedOption(null);
    setSubmitted(false);
    setCounts(Array(question.options.length).fill(0));
    setTimeLeft(remainingSeconds);
    setEnded(false);

    const socket = getSocket();

    socket.on("timer:tick", ({ remainingSeconds: r }: { remainingSeconds: number }) => {
      setTimeLeft(r);
    });

    socket.on("poll:votes", (data: { questionId: number; counts: number[]; type?: string }) => {
      if (Number(data.questionId) !== Number(question.id)) return;
      if (data.type && data.type !== "quiz") return;
      const countsArr = Array.isArray(data.counts) ? data.counts.map(Number) : [];
      setCounts(countsArr.length >= question.options.length ? countsArr : [...countsArr, ...Array(question.options.length - countsArr.length).fill(0)]);
    });

    socket.on("poll:end", (data: { counts: number[]; questionId?: number }) => {
      if (data.questionId != null && Number(data.questionId) !== Number(question.id)) return;
      if (data.counts) setCounts(Array.isArray(data.counts) ? data.counts.map(Number) : []);
      setEnded(true);
    });

    return () => {
      socket.off("timer:tick");
      socket.off("poll:votes");
      socket.off("poll:end");
    };
  }, [question.id, question.options.length]);

  function handleSelectOption(i: number) {
    if (submitted || ended) return;
    setSelectedOption(i);
  }

  function handleSubmit() {
    if (selectedOption === null || submitted || ended) return;
    setSubmitted(true);
    getSocket().emit("poll:vote", { questionId: question.id, option: selectedOption, token, type: "quiz" });
    onNext?.();
  }

  const total = counts.reduce((a, b) => a + b, 0);
  const isUrgent = timeLeft <= 10 && !ended;
  const showLivePct = submitted || ended;

  return (
    <Dialog open>
      <DialogContent
        className="max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Quiz question</DialogTitle>
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
            const isMyAnswer = submitted && selectedOption === i;

            return (
              <button
                key={i}
                type="button"
                disabled={ended || submitted}
                onClick={() => handleSelectOption(i)}
                className={cn(
                  "relative w-full overflow-hidden rounded-lg border px-4 py-3 text-left text-sm transition-all",
                  !ended && !submitted ? "hover:border-primary hover:bg-primary/5 cursor-pointer" : "cursor-default",
                  isSelected && !submitted && "border-primary bg-primary/10",
                  isMyAnswer && "border-muted-foreground/40 bg-muted/50",
                  !isSelected && !isMyAnswer && "border-border"
                )}
              >
                {showLivePct && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg bg-muted/60 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-muted-foreground">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt}
                    {isMyAnswer && <span className="text-xs text-muted-foreground ml-1">✓ Your answer</span>}
                  </span>
                  {showLivePct && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {pct}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {!ended && !submitted && (
          <Button
            className="mt-3 w-full"
            disabled={selectedOption === null}
            onClick={handleSubmit}
          >
            {isLastQuestion ? "Submit all" : "Next question"}
          </Button>
        )}

        {ended && (
          <div className="mt-4 space-y-3">
            <p className="text-center text-xs text-muted-foreground">Question ended</p>
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
