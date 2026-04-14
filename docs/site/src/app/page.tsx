import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border px-4 sm:px-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-[family-name:var(--font-mono)] text-sm font-bold">
                T
              </span>
            </div>
            <span className="font-[family-name:var(--font-heading)] font-semibold text-lg tracking-tight">
              TSN
            </span>
          </div>
          <nav className="flex items-center gap-4 sm:gap-6 text-sm">
            <Link
              href="/docs"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Docs
            </Link>
            <a
              href="https://github.com/rajatady/tsn"
              className="text-muted-foreground hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener"
            >
              GitHub
            </a>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6">
        <div className="max-w-2xl w-full text-center py-16 sm:py-24">
          <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] mb-6">
            TypeScript,{" "}
            <span className="text-primary">Native.</span>
          </h1>

          <p className="text-muted-foreground text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto">
            Write a strict subset of TypeScript. Get predictable native ARM64
            binaries. No runtime. No garbage collector. No magic.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <Link
              href="/docs"
              className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Read the docs
            </Link>
            <Link
              href="/docs/language"
              className="inline-flex items-center px-6 py-3 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Language reference
            </Link>
          </div>

          {/* Code sample */}
          <div className="text-left rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
              <div className="w-3 h-3 rounded-full bg-border" />
              <div className="w-3 h-3 rounded-full bg-border" />
              <div className="w-3 h-3 rounded-full bg-border" />
              <span className="text-xs text-muted-foreground ml-2 font-[family-name:var(--font-mono)]">
                example.ts
              </span>
            </div>
            <pre className="p-4 sm:p-6 text-xs sm:text-sm leading-relaxed font-[family-name:var(--font-mono)] overflow-x-auto">
              <code>{`import { readFileAsync } from "@tsn/fs"

interface LogEntry {
  timestamp: string
  level: string
  message: string
}

async function main(): Promise<void> {
  const raw = await readFileAsync("server.log")
  const lines = raw.split("\\n")

  const errors = lines.filter(
    (line: string): boolean => line.includes("ERROR")
  )

  console.log("Errors found:", errors.length)
}`}</code>
            </pre>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Compiles to a native binary via C. Zero runtime overhead.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        TSN is an experiment in predictable native TypeScript.
      </footer>
    </div>
  );
}
