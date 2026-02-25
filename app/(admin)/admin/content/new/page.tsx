"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function NewContentPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), markdown }),
    });
    if (res.ok) {
      const doc = await res.json();
      toast.success("Created");
      router.push(`/admin/content/${doc.id}`);
    } else toast.error("Failed to create");
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/content" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Content
        </Link>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="# Heading\n\nBody text. Mermaid: ```mermaid\ngraph LR\n  A --> B\n```"
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
