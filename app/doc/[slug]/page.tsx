"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MarkdownViewer } from "@/components/attendee/MarkdownViewer";

type Doc = { id: number; title: string; markdown: string; published: boolean; slug?: string } | null;

export default function DocPage() {
  const { slug } = useParams<{ slug: string }>();
  const [doc, setDoc] = useState<Doc>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/content/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => {
        setDoc(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b px-6 py-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-8">
          <p className="text-muted-foreground">Loading…</p>
        </main>
      </div>
    );
  }

  if (!doc || !doc.published) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b px-6 py-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-8">
          <p className="text-muted-foreground">Document not found.</p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="outline">Go home</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold">{doc.title}</h1>
        <MarkdownViewer markdown={doc.markdown} className="prose prose-neutral dark:prose-invert max-w-none" />
      </main>
    </div>
  );
}
