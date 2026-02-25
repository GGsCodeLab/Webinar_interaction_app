"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, CheckCircle } from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Quiz = { id: number; name: string };

function CreateQuizQuestionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultQuizId = searchParams.get("quizId") ?? "";

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizId, setQuizId] = useState(defaultQuizId);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/quizzes").then((r) => r.json()).then(setQuizzes);
  }, []);

  function addOption() { if (options.length < 6) setOptions([...options, ""]); }
  function removeOption(i: number) {
    if (options.length <= 4) return;
    const next = options.filter((_, idx) => idx !== i);
    setOptions(next);
    if (correctOptionIndex >= next.length) setCorrectOptionIndex(0);
  }
  function updateOption(i: number, val: string) {
    const next = [...options]; next[i] = val; setOptions(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quizId || !question.trim() || options.some((o) => !o.trim())) {
      toast.error("Please fill all fields"); return;
    }
    setLoading(true);
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: parseInt(quizId), question, options, correctOptionIndex }),
    });
    if (res.ok) {
      const q = await res.json();
      toast.success("Question created");
      router.push(`/admin/quiz-questions/${q.id}`);
    } else {
      toast.error("Failed to create question");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={defaultQuizId ? `/admin/quizzes/${defaultQuizId}` : "/admin/quizzes"} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Back
      </Link>
      <Card>
        <CardHeader><CardTitle>Create Quiz Question</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Quiz</Label>
              <Select value={quizId} onValueChange={setQuizId}>
                <SelectTrigger><SelectValue placeholder="Select a quiz" /></SelectTrigger>
                <SelectContent>
                  {quizzes.map((q) => <SelectItem key={q.id} value={String(q.id)}>{q.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Question</Label>
              <RichTextEditor value={question} onChange={setQuestion} placeholder="Enter quiz question…" />
            </div>
            <div className="space-y-3">
              <Label>Options (4–6) — click the checkmark to set the correct answer</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrectOptionIndex(i)}
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      correctOptionIndex === i
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-muted-foreground/30 text-transparent hover:border-green-400"
                    )}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                  <span className="w-6 shrink-0 text-sm font-medium text-muted-foreground">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <Input value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                  {options.length > 4 && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeOption(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="mr-2 h-4 w-4" />Add Option
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Timer is set at the quiz level. Edit the quiz to change the time per question.</p>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating…" : "Create Question"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreateQuizQuestionPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl py-8 text-center text-muted-foreground">Loading…</div>}>
      <CreateQuizQuestionForm />
    </Suspense>
  );
}
