"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import type { DocPage } from "@/lib/docs";

interface SearchResult {
  slug: string;
  title: string;
  category: string;
  snippet: string;
}

function searchDocs(pages: DocPage[], query: string): SearchResult[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const page of pages) {
    const titleMatch = page.title.toLowerCase().includes(q);
    const contentLower = page.content.toLowerCase();
    const contentMatch = contentLower.includes(q);

    if (!titleMatch && !contentMatch) continue;

    let snippet = "";
    if (contentMatch) {
      const idx = contentLower.indexOf(q);
      const start = Math.max(0, idx - 60);
      const end = Math.min(page.content.length, idx + query.length + 60);
      snippet = (start > 0 ? "..." : "") + page.content.slice(start, end).replace(/\n/g, " ").trim() + (end < page.content.length ? "..." : "");
    }

    results.push({
      slug: page.slug,
      title: page.title,
      category: page.category,
      snippet: snippet || page.content.slice(0, 120).replace(/^#.*\n/, "").replace(/\n/g, " ").trim() + "...",
    });
  }

  return results.slice(0, 8);
}

export function DocsSearch({ pages }: { pages: DocPage[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchDocs(pages, query), [pages, query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function navigate(slug: string) {
    setOpen(false);
    setQuery("");
    router.push(`/docs/${slug}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder="Search docs..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="h-8 w-full text-xs bg-sidebar-accent/50 border-sidebar-border placeholder:text-muted-foreground/60"
        />
        <kbd className="absolute right-2 top-1.5 pointer-events-none text-[10px] text-muted-foreground/50 border border-border rounded px-1">
          ⌘K
        </kbd>
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {results.map((r) => (
            <button
              key={r.slug}
              onClick={() => navigate(r.slug)}
              className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b border-border last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{r.category}</span>
                <span className="text-sm font-medium">{r.title}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.snippet}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
