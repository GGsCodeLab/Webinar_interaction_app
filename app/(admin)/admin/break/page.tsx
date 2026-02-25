"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Coffee, Play, Square } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";

const BREAK_DURATION = 5 * 60; // 5 minutes in seconds

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function BreakPage() {
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(BREAK_DURATION);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startBreak() {
    setRunning(true);
    setRemaining(BREAK_DURATION);
    const socket = getSocket();
    socket.emit("admin:startBreak");
    toast.success("Break started — attendees now see the Dino game");

    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          stopBreak();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopBreak() {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    const socket = getSocket();
    socket.emit("admin:setIdle");
    toast.info("Break ended");
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const progress = ((BREAK_DURATION - remaining) / BREAK_DURATION) * 100;

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-8 text-center">
        <Coffee className="h-16 w-16 text-muted-foreground/60" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Take a Break</h1>
          <p className="mt-2 text-muted-foreground">
            Starts a 5-minute break. Attendees will see the Dino game.
          </p>
        </div>

        {running ? (
          <div className="flex flex-col items-center gap-6">
            <div className="text-7xl font-mono font-bold tabular-nums text-primary">
              {formatTime(remaining)}
            </div>
            <div className="h-2 w-64 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <Button variant="outline" size="lg" onClick={stopBreak}>
              <Square className="mr-2 h-5 w-5" />
              End Break
            </Button>
          </div>
        ) : (
          <Button size="lg" className="h-16 px-10 text-lg" onClick={startBreak}>
            <Play className="mr-3 h-6 w-6" />
            Start Break
          </Button>
        )}
      </div>
    </div>
  );
}
