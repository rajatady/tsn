"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DocCategory } from "@/lib/docs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function MobileNav({ categories }: { categories: DocCategory[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="lg:hidden w-10 h-10 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-manipulation"
        aria-label="Open navigation"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <div className="p-6 border-b border-border">
          <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-[family-name:var(--font-mono)] text-sm font-bold">
                T
              </span>
            </div>
            <span className="font-[family-name:var(--font-heading)] font-semibold text-lg tracking-tight">
              TSN
            </span>
          </Link>
        </div>
        <ScrollArea className="h-[calc(100vh-80px)] px-4 py-6">
          <nav>
            {categories.map((cat) => (
              <div key={cat.name} className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-2">
                  {cat.label}
                </h3>
                <ul className="space-y-0.5">
                  {cat.pages.map((page) => {
                    const href = `/docs/${page.slug}`;
                    const isActive = pathname === href;
                    return (
                      <li key={page.slug}>
                        <Link
                          href={href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "block px-2 py-1.5 rounded-md text-sm transition-colors",
                            isActive
                              ? "bg-accent text-accent-foreground font-medium"
                              : "text-foreground/70 hover:bg-accent/50"
                          )}
                        >
                          {page.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
