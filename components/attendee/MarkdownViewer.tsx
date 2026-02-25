"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import mermaid from "mermaid";

type Props = { markdown: string; className?: string };

export function MarkdownViewer({ markdown, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      securityLevel: "loose",
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const preBlocks = containerRef.current.querySelectorAll<HTMLPreElement>("pre.mermaid");
    if (preBlocks.length === 0) return;
    mermaid.run({ nodes: Array.from(preBlocks), suppressErrors: true }).catch(() => {});
  }, [markdown]);

  return (
    <div ref={containerRef} className={className}>
      <ReactMarkdown
        components={{
          code({ node, className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName ?? "");
            const code = String(children).replace(/\n$/, "");
            if (match?.[1] === "mermaid") {
              return (
                <pre key={String(children)} className="mermaid my-4 rounded-md border bg-muted/50 p-4">
                  {code}
                </pre>
              );
            }
            return (
              <code className={codeClassName} {...props}>
                {children}
              </code>
            );
          },
          h1: ({ children }) => <h1 className="mb-3 mt-6 text-2xl font-bold first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-4 text-xl font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-3 text-lg font-semibold">{children}</h3>,
          p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 list-inside list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-inside list-decimal space-y-1">{children}</ol>,
          a: ({ href, children }) => (
            <a href={href} className="text-primary underline underline-offset-4" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
