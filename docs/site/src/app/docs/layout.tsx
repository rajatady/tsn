import Link from "next/link";
import { getCategories, getAllDocs } from "@/lib/docs";
import { DocsSidebar } from "@/components/docs-sidebar";
import { DocsSearch } from "@/components/docs-search";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = getCategories();
  const allDocs = getAllDocs();

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[280px] flex-col border-r border-border bg-sidebar sticky top-0 h-screen shrink-0">
        <div className="p-6 pb-4 border-b border-sidebar-border shrink-0 space-y-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-[family-name:var(--font-mono)] text-sm font-bold">
                T
              </span>
            </div>
            <div>
              <span className="font-[family-name:var(--font-heading)] font-semibold text-lg tracking-tight">
                TSN
              </span>
              <span className="text-muted-foreground text-xs ml-2">docs</span>
            </div>
          </Link>
          <DocsSearch pages={allDocs} />
        </div>

        <DocsSidebar categories={categories} />

        <div className="p-4 border-t border-sidebar-border flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground">
            Generated from source
          </span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between h-14 px-3">
            <div className="flex items-center gap-3">
              <MobileNav categories={categories} />
              <Link href="/" className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-[family-name:var(--font-mono)] text-xs font-bold">
                    T
                  </span>
                </div>
                <span className="font-[family-name:var(--font-heading)] font-semibold text-sm">
                  TSN
                </span>
              </Link>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
