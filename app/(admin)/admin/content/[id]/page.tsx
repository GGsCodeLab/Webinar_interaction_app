"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Ban } from "lucide-react";
import { toast } from "sonner";

type Doc = { id: number; title: string; markdown: string; published: boolean; slug?: string | null; updatedAt: string };

export default function EditContentPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetch(`/api/content/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setDoc(d);
          setTitle(d.title);
          setMarkdown(d.markdown ?? "");
        }
      });
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!doc || !title.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/content/${doc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), markdown }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDoc(updated);
      toast.success("Saved");
    } else toast.error("Failed to save");
    setSaving(false);
  }

  async function handlePublish() {
    if (!doc) return;
    setPublishing(true);
    const res = await fetch(`/api/content/${doc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: true }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDoc(updated);
      toast.success("Published — link is now visible to attendees.");
    } else toast.error("Failed to publish");
    setPublishing(false);
  }

  async function handleUnpublish() {
    if (!doc) return;
    setPublishing(true);
    const res = await fetch(`/api/content/${doc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: false }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDoc(updated);
      toast.success("Unpublished — link hidden from attendees.");
    } else toast.error("Failed to unpublish");
    setPublishing(false);
  }

  if (!doc) {
    return (
      <div className="space-y-6">
        <Link href="/admin/content" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Content
        </Link>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/content" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Content
        </Link>
        <div className="flex gap-2">
          {doc.published ? (
            <Button variant="outline" onClick={handleUnpublish} disabled={publishing}>
              <Ban className="mr-2 h-4 w-4" />
              {publishing ? "Unpublishing…" : "Unpublish"}
            </Button>
          ) : (
            <Button onClick={handlePublish} disabled={publishing}>
              <Send className="mr-2 h-4 w-4" />
              {publishing ? "Publishing…" : "Publish"}
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2 rounded-md border bg-muted/40 p-3">
          <Label className="text-muted-foreground">Slug (attendee URL path)</Label>
          <p className="font-mono text-sm break-all" title="Use this path after your domain for the attendee doc link">
            {doc.slug ? (
              <>
                <span className="text-muted-foreground">/doc/</span>
                <span>{doc.slug}</span>
              </>
            ) : (
              <span className="text-muted-foreground italic">(no slug yet — save or publish to set)</span>
            )}
          </p>
          {doc.published && (doc.slug ?? doc.id) && (
            <a
              href={typeof window !== "undefined" ? `${window.location.origin}/doc/${doc.slug ?? doc.id}` : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Open attendee link →
            </a>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Doc title"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="markdown">Markdown</Label>
          <textarea
            id="markdown"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="min-h-[320px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            spellCheck={false}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving || !title.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Link href="/admin/content">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
