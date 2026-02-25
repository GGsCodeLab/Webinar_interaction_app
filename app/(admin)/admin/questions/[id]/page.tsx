"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Play } from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { StartNowDialog } from "@/components/admin/StartNowDialog";
import { toast } from "sonner";

type Topic = { id: number; name: string };

export default function EditQuestionPage() {
  const { id } = useParams<{ id: string }>();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState("");
  const [pollId, setPollId] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/polls/${id}`).then((r) => r.json()),
      fetch("/api/topics").then((r) => r.json()),
    ]).then(([q, t]) => {
      setPollId(q.pollId);
      setQuestion(q.question);
      setOptions(q.options as string[]);
      setTimerSeconds(q.timerSeconds);
      setTopicId(String(q.topicId));
      setTopics(t);
      setLoading(false);
    });
  }, [id]);

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/polls/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, options, timerSeconds, topicId: parseInt(topicId) }),
    });
    if (res.ok) {
      toast.success("Saved");
    } else {
      toast.error("Save failed");
    }
    setSaving(false);
  }

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={topicId ? `/admin/topics/${topicId}` : "/admin/topics"}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Topic
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Edit Poll Question</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Poll ID: <Badge variant="outline">{pollId}</Badge>
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Play className="mr-2 h-4 w-4" />
            Start Now
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
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
              <RichTextEditor value={question} onChange={setQuestion} />
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

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <StartNowDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        questionId={parseInt(id)}
        questionText={question}
        options={options}
        timerSeconds={timerSeconds}
        type="poll"
      />
    </div>
  );
}
