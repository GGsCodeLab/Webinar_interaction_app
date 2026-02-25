"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type QuestionEntry = {
  question: string;
  options: string[];
  correctOptionIndex: number;
};

const defaultQuestion = (): QuestionEntry => ({
  question: "",
  options: ["", "", "", ""],
  correctOptionIndex: 0,
});

export default function AddQuestionsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quizId = params.id;
  const [quizName, setQuizName] = useState<string>("");
  const [entries, setEntries] = useState<QuestionEntry[]>([defaultQuestion()]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/quizzes/${quizId}`)
      .then((r) => r.json())
      .then((d) => setQuizName(d?.quiz?.name ?? "Quiz"));
  }, [quizId]);

  function addQuestion() {
    setEntries((e) => [...e, defaultQuestion()]);
  }

  function removeQuestion(index: number) {
    if (entries.length <= 1) return;
    setEntries((e) => e.filter((_, i) => i !== index));
  }

  function updateQuestion(index: number, field: keyof QuestionEntry, value: string | string[] | number) {
    setEntries((e) => {
      const next = [...e];
      (next[index] as Record<string, unknown>)[field] = value;
      return next;
    });
  }

  function addOption(qIndex: number) {
    const q = entries[qIndex];
    if (q.options.length >= 6) return;
    setEntries((e) => {
      const next = [...e];
      next[qIndex] = { ...next[qIndex], options: [...next[qIndex].options, ""] };
      return next;
    });
  }

  function removeOption(qIndex: number, oIndex: number) {
    const q = entries[qIndex];
    if (q.options.length <= 4) return;
    setEntries((e) => {
      const next = [...e];
      const options = next[qIndex].options.filter((_, i) => i !== oIndex);
      let correct = next[qIndex].correctOptionIndex;
      if (correct >= options.length) correct = 0;
      else if (oIndex < correct) correct--;
      next[qIndex] = { ...next[qIndex], options, correctOptionIndex: correct };
      return next;
    });
  }

  function setOption(qIndex: number, oIndex: number, value: string) {
    setEntries((e) => {
      const next = [...e];
      const options = [...next[qIndex].options];
      options[oIndex] = value;
      next[qIndex] = { ...next[qIndex], options };
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = entries.filter(
      (q) => q.question.trim() && q.options.filter((o) => o.trim()).length >= 4
    );
    if (valid.length === 0) {
      toast.error("Add at least one question with 4–6 options.");
      return;
    }
    setLoading(true);
    let created = 0;
    for (const q of valid) {
      const options = q.options.map((o) => o.trim()).filter(Boolean);
      if (options.length < 4 || options.length > 6) continue;
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: parseInt(quizId),
          question: q.question.trim(),
          options,
          correctOptionIndex: Math.min(q.correctOptionIndex, options.length - 1),
        }),
      });
      if (res.ok) created++;
    }
    setLoading(false);
    if (created > 0) {
      toast.success(`${created} question${created !== 1 ? "s" : ""} added`);
      router.push(`/admin/quizzes/${quizId}`);
    } else {
      toast.error("Failed to add questions");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/admin/quizzes/${quizId}`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {quizName || "Quiz"}
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Add questions</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="mr-2 h-4 w-4" />
            Add question
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {entries.map((entry, qIndex) => (
              <div
                key={qIndex}
                className="rounded-lg border bg-muted/30 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Question {qIndex + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeQuestion(qIndex)}
                    disabled={entries.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Question text</Label>
                  <Input
                    value={entry.question}
                    onChange={(e) =>
                      updateQuestion(qIndex, "question", e.target.value)
                    }
                    placeholder="Enter question…"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Options (4–6) — click ✓ for correct answer</Label>
                  {entry.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuestion(qIndex, "correctOptionIndex", oIndex)
                        }
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          entry.correctOptionIndex === oIndex
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-muted-foreground/30 text-transparent hover:border-green-400"
                        )}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <span className="w-6 shrink-0 text-sm font-medium text-muted-foreground">
                        {String.fromCharCode(65 + oIndex)}.
                      </span>
                      <Input
                        value={opt}
                        onChange={(e) =>
                          setOption(qIndex, oIndex, e.target.value)
                        }
                        placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                        className="flex-1"
                      />
                      {entry.options.length > 4 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeOption(qIndex, oIndex)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {entry.options.length < 6 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(qIndex)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add option
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Adding…" : `Save all questions (${entries.length})`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={addQuestion}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add another
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
