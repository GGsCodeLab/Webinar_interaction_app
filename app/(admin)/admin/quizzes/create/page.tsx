"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const MIN_TIMER = 60;
const MAX_TIMER = 7200;
const DEFAULT_TIMER = 300;

export default function CreateQuizPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_TIMER);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const timer = Math.min(MAX_TIMER, Math.max(MIN_TIMER, timerSeconds));
    setLoading(true);

    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, timerSeconds: timer }),
    });

    if (res.ok) {
      const quiz = await res.json();
      toast.success("Quiz created");
      router.push(`/admin/quizzes/${quiz.id}`);
    } else {
      toast.error("Failed to create quiz");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/admin/quizzes" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Quizzes
      </Link>
      <Card>
        <CardHeader><CardTitle>Create Quiz</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Quiz Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. React Fundamentals Quiz"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timer">Total time for quiz (seconds)</Label>
              <Input
                id="timer"
                type="number"
                min={MIN_TIMER}
                max={MAX_TIMER}
                value={timerSeconds}
                onChange={(e) => setTimerSeconds(parseInt(e.target.value, 10) || DEFAULT_TIMER)}
              />
              <p className="text-xs text-muted-foreground">e.g. 300 = 5 min, 600 = 10 min (1–120 min)</p>
            </div>
            <Button type="submit" disabled={loading || !name.trim()} className="w-full">
              {loading ? "Creating..." : "Create Quiz"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
