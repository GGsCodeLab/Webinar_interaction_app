"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Topic = { id: number; name: string; createdAt: string };

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/topics");
    setTopics(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteTopic(id: number) {
    if (!confirm("Delete this topic and all its questions?")) return;
    await fetch(`/api/topics/${id}`, { method: "DELETE" });
    toast.success("Topic deleted");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Polls</h1>
          <p className="text-sm text-muted-foreground">Manage poll topics and their questions</p>
        </div>
        <Link href="/admin/topics/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Topic
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
      ) : topics.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No topics yet. Create your first topic.</p>
            <Link href="/admin/topics/create" className="mt-4">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create Topic
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <Card key={topic.id} className="group">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <Link href={`/admin/topics/${topic.id}`} className="flex-1">
                  <CardTitle className="text-base font-semibold hover:underline">
                    {topic.name}
                  </CardTitle>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteTopic(topic.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent>
                <Link href={`/admin/topics/${topic.id}`}>
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
