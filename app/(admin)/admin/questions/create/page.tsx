"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { toast } from "sonner";

type Topic = { id: number; name: string };

function CreateQuestionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTopicId = searchParams.get("topicId") ?? "";

  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState(defaultTopicId);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/topics").then((r) => r.json()).then(setTopics);
  }, []);

  function addOption() {
    if (options.length < 6) setOptions([...options, ""]);
  }

  function removeOption(i: number) {
    if (options.length <= 4) return;
    setOptions(options.filter((_, idx) => idx !== i));
  }

  function updateOption(i: number, val: string) {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topicId || !question.trim() || options.some((o) => !o.trim())) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);

    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId: parseInt(topicId), question, options, timerSeconds }),
    });

    if (res.ok) {
      const q = await res.json();
      toast.success("Question created");
      router.push(`/admin/questions/${q.id}`);
    } else {
      toast.error("Failed to create question");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={defaultTopicId ? `/admin/topics/${defaultTopicId}` : "/admin/topics"}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create Poll Question</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Topic</Label>
              <Select value={topicId} onValueChange={setTopicId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Question</Label>
              <RichTextEditor
                value={question}
                onChange={setQuestion}
                placeholder="Enter your poll question…"
              />
            </div>

            <div className="space-y-3">
              <Label>Options (4–6)</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-sm font-medium text-muted-foreground">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  />
                  {options.length > 4 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeOption(i)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Option
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="timer">Timer (seconds)</Label>
              <Input
                id="timer"
                type="number"
                min={10}
                max={600}
                value={timerSeconds}
                onChange={(e) => setTimerSeconds(parseInt(e.target.value))}
                className="w-32"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating…" : "Create Question"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreateQuestionPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl py-8 text-center text-muted-foreground">Loading…</div>}>
      <CreateQuestionForm />
    </Suspense>
  );
}
