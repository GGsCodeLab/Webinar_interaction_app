"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, CheckCircle } from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Quiz = { id: number; name: string };

export default function EditQuizQuestionPage() {
  const { id } = useParams<{ id: string }>();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizId, setQuizId] = useState("");
  const [pollId, setPollId] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/quiz/${id}`).then((r) => r.json()),
      fetch("/api/quizzes").then((r) => r.json()),
    ]).then(([q, qz]) => {
      setPollId(q.pollId);
      setQuestion(q.question);
      setOptions(q.options as string[]);
      setCorrectOptionIndex(q.correctOptionIndex);
      setQuizId(String(q.quizId));
      setQuizzes(qz);
      setLoading(false);
    });
  }, [id]);

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/quiz/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, options, correctOptionIndex, quizId: parseInt(quizId) }),
    });
    if (res.ok) { toast.success("Saved"); } else { toast.error("Save failed"); }
    setSaving(false);
  }

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={quizId ? `/admin/quizzes/${quizId}` : "/admin/quizzes"} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Back to Quiz
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Edit Quiz Question</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            ID: <Badge variant="outline">{pollId}</Badge>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
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
              <RichTextEditor value={question} onChange={setQuestion} />
            </div>
            <div className="space-y-3">
              <Label>Options — click ✓ to mark correct answer</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrectOptionIndex(i)}
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      correctOptionIndex === i ? "border-green-500 bg-green-500 text-white" : "border-muted-foreground/30 text-transparent hover:border-green-400"
                    )}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                  <span className="w-6 shrink-0 text-sm font-medium text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
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
            <Button type="submit" disabled={saving} className="w-full">{saving ? "Saving…" : "Save Changes"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
