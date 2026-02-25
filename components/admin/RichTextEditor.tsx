"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";
import { Bold, Italic, List, ListOrdered, Heading2, Heading3 } from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
};

export function RichTextEditor({ value, onChange, placeholder, className }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "Enter question text…" }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className={cn("rounded-md border bg-background", className)}>
      <div className="flex flex-wrap gap-1 border-b p-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "rounded px-2 py-1 text-sm transition-colors hover:bg-muted",
            editor.isActive("bold") && "bg-muted font-bold"
          )}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "rounded px-2 py-1 text-sm transition-colors hover:bg-muted",
            editor.isActive("italic") && "bg-muted"
          )}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(
            "rounded px-2 py-1 text-sm transition-colors hover:bg-muted",
            editor.isActive("heading", { level: 2 }) && "bg-muted"
          )}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn(
            "rounded px-2 py-1 text-sm transition-colors hover:bg-muted",
            editor.isActive("heading", { level: 3 }) && "bg-muted"
          )}
        >
          <Heading3 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "rounded px-2 py-1 text-sm transition-colors hover:bg-muted",
            editor.isActive("bulletList") && "bg-muted"
          )}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "rounded px-2 py-1 text-sm transition-colors hover:bg-muted",
            editor.isActive("orderedList") && "bg-muted"
          )}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-3 focus:outline-none [&_.ProseMirror]:min-h-[100px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  );
}
