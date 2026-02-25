"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trophy, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Quiz = { id: number; name: string; createdAt: string };

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/quizzes");
      const data = await res.json();
      setQuizzes(res.ok ? data : []);
      if (!res.ok) toast.error("Failed to load quizzes");
    } catch {
      setQuizzes([]);
      toast.error("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function deleteQuiz(id: number) {
    if (!confirm("Delete this quiz and all its questions?")) return;
    await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
    toast.success("Quiz deleted");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quizzes</h1>
          <p className="text-sm text-muted-foreground">Manage quizzes with right/wrong answers</p>
        </div>
        <Link href="/admin/quizzes/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Quiz
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-5 w-32 rounded bg-muted" /></CardHeader>
            </Card>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No quizzes yet.</p>
            <Link href="/admin/quizzes/create" className="mt-4">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create Quiz
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="group">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <Link href={`/admin/quizzes/${quiz.id}`} className="flex-1">
                  <CardTitle className="text-base font-semibold hover:underline">
                    {quiz.name}
                  </CardTitle>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteQuiz(quiz.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent>
                <Link href={`/admin/quizzes/${quiz.id}`}>
                  <Badge variant="secondary">View Questions →</Badge>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
