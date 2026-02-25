"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trash2, Pencil, Send, Ban } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

type Doc = { id: number; title: string; markdown: string; published: boolean; slug?: string | null; createdAt: string; updatedAt: string };

export default function ContentPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/content");
    if (res.ok) setDocs(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handlePublish(doc: Doc) {
    const res = await fetch(`/api/content/${doc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: true }),
    });
    if (res.ok) {
      toast.success(`"${doc.title}" is now published — link visible to attendees`);
      load();
    } else toast.error("Failed to publish");
  }

  async function handleUnpublish(doc: Doc) {
    const res = await fetch(`/api/content/${doc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: false }),
    });
    if (res.ok) {
      toast.success(`"${doc.title}" unpublished — link hidden from attendees`);
      load();
    } else toast.error("Failed to unpublish");
  }

  async function handleDelete(doc: Doc) {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    const res = await fetch(`/api/content/${doc.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      load();
    } else toast.error("Failed to delete");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content</h1>
          <p className="text-sm text-muted-foreground">Markdown docs for attendees. Publish to show on home page.</p>
        </div>
        <Link href="/admin/content/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Doc
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-md border bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No content yet. Create your first doc.</p>
            <Link href="/admin/content/new" className="mt-4">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                New Doc
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border bg-background">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="p-3 font-medium">Title</th>
                <th className="p-3 font-medium min-w-[180px]">Slug / Attendee URL</th>
                <th className="p-3 font-medium w-28">Status</th>
                <th className="p-3 font-medium w-36">Updated</th>
                <th className="p-3 font-medium w-44 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{doc.title}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {doc.published && (doc.slug ?? doc.id) ? (
                      <a
                        href={typeof window !== "undefined" ? `${window.location.origin}/doc/${doc.slug ?? doc.id}` : "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        /doc/{doc.slug ?? doc.id}
                      </a>
                    ) : (
                      <span className="text-muted-foreground/70">{doc.slug ?? "(no slug — publish to set)"}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {doc.published ? (
                      <Badge variant="secondary">Published</Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/content/${doc.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      {doc.published ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUnpublish(doc)}
                          title="Unpublish"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePublish(doc)}
                          title="Publish"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(doc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Toaster />
    </div>
  );
}
