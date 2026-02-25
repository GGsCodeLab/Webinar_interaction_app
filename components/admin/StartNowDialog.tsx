"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSocket } from "@/lib/socket";

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

type Props = {
  open: boolean;
  onClose: () => void;
  questionId: number;
  questionText: string;
  options: string[];
  timerSeconds: number;
  type: "poll" | "quiz";
  /** When true, poll/quiz is already live — do not emit start, use initialRemaining for countdown */
  alreadyLive?: boolean;
  initialRemainingSeconds?: number;
  /** When set, show results from DB (view-only); do not emit admin:startPoll. For poll View button. */
  initialCounts?: number[];
  /** Only for quiz: emit admin:nextQuestion to move to next question */
  onNextQuestion?: () => void;
  hasNextQuestion?: boolean;
};

export function StartNowDialog({
  open,
  onClose,
  questionId,
  questionText,
  options,
  timerSeconds,
  type,
  alreadyLive = false,
  initialRemainingSeconds,
  initialCounts,
  onNextQuestion,
  hasNextQuestion = false,
}: Props) {
  const viewOnly = Boolean(initialCounts && initialCounts.length > 0 && !alreadyLive);
  const [remaining, setRemaining] = useState(initialRemainingSeconds ?? timerSeconds);
  const [counts, setCounts] = useState<number[]>(initialCounts ?? Array(options.length).fill(0));
  const [ended, setEnded] = useState(viewOnly);
  const [totalResponses, setTotalResponses] = useState(
    viewOnly ? (initialCounts?.reduce((a, b) => a + b, 0) ?? 0) : 0
  );
  const socketRef = useRef(getSocket());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) return;
    const hasInitialCounts = initialCounts && initialCounts.length >= options.length;
    const isViewOnly = hasInitialCounts && !alreadyLive;
    setRemaining(alreadyLive ? (initialRemainingSeconds ?? timerSeconds) : timerSeconds);
    setCounts(hasInitialCounts ? initialCounts.slice(0, options.length) : Array(options.length).fill(0));
    setEnded(Boolean(isViewOnly));
    setTotalResponses(isViewOnly ? (initialCounts?.reduce((a, b) => a + b, 0) ?? 0) : 0);

    const socket = socketRef.current;

    if (!alreadyLive && !isViewOnly) socket.emit("admin:startPoll", { questionId, type });

    // Listen for live vote updates
    socket.on("poll:votes", (data: { questionId: number; counts: number[] }) => {
      if (data.questionId === questionId) {
        setCounts(data.counts);
        setTotalResponses(data.counts.reduce((a, b) => a + b, 0));
      }
    });

    // Listen for tick
    socket.on("timer:tick", ({ remainingSeconds }: { remainingSeconds: number }) => {
      setRemaining(remainingSeconds);
    });

    // Listen for end
    socket.on("poll:end", (data: { counts: number[]; questionId: number }) => {
      if (data.questionId === questionId) {
        setCounts(data.counts);
        setTotalResponses(data.counts.reduce((a, b) => a + b, 0));
        setEnded(true);
      }
    });

    return () => {
      socket.off("poll:votes");
      socket.off("timer:tick");
      socket.off("poll:end");
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, questionId, timerSeconds, options.length, type, alreadyLive, initialRemainingSeconds, initialCounts]);

  const isQuiz = type === "quiz";
  const quizOnlyTimer = isQuiz && !ended;
  const quizEndedNoNext = isQuiz && ended && !hasNextQuestion;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        {!quizOnlyTimer && (
          <DialogHeader>
            <DialogTitle
              className="text-base font-semibold leading-snug"
              dangerouslySetInnerHTML={{ __html: questionText }}
            />
          </DialogHeader>
        )}
        {quizOnlyTimer && (
          <DialogTitle className="sr-only">Quiz in progress</DialogTitle>
        )}

        {!ended ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-5xl font-mono font-bold tabular-nums text-primary">
              {formatTime(remaining)}
            </div>
            {!quizOnlyTimer && (
              <>
                <p className="text-sm text-muted-foreground">
                  Responses: <span className="font-semibold text-foreground">{totalResponses}</span>
                </p>
                <div className="w-full space-y-2">
                  {options.map((opt, i) => {
                    const total = counts.reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate max-w-[70%]">{opt}</span>
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
              </>
            )}
            {quizOnlyTimer && (
              <p className="text-sm text-muted-foreground">Quiz in progress</p>
            )}
          </div>
        ) : (
          <div className="py-4">
            {isQuiz ? (
              <>
                {quizEndedNoNext ? (
                  <p className="text-center text-sm text-muted-foreground">Quiz ended</p>
                ) : (
                  <p className="mb-4 text-center text-sm text-muted-foreground">
                    Question ended · <span className="font-semibold text-foreground">{totalResponses}</span> responses
                  </p>
                )}
                {hasNextQuestion && onNextQuestion && (
                  <div className="mt-4 flex justify-center">
                    <Button onClick={onNextQuestion}>Next question</Button>
                  </div>
                )}
                {quizEndedNoNext && (
                  <div className="mt-4 flex justify-center">
                    <Button onClick={onClose}>Close</Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="mb-4 text-center text-sm text-muted-foreground">
                  Poll ended · <span className="font-semibold text-foreground">{totalResponses}</span> responses
                </p>
                <div className="w-full space-y-2">
                  {options.map((opt, i) => {
                    const total = counts.reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate max-w-[70%]">{opt}</span>
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
              </>
            )}
          </div>
        )}
        {!ended && isQuiz && hasNextQuestion && onNextQuestion && (
          <div className="mt-2 flex justify-center border-t pt-3">
            <Button variant="outline" size="sm" onClick={onNextQuestion}>
              Skip to next question
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
