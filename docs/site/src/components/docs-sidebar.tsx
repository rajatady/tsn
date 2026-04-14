"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DocCategory } from "@/lib/docs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function DocsSidebar({ categories }: { categories: DocCategory[] }) {
  const pathname = usePathname();

  return (
    <ScrollArea className="flex-1 px-4 py-6">
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
                      className={cn(
                        "block px-2 py-1.5 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
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
  );
}
