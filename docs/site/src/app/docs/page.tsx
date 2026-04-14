import Link from "next/link";
import { getCategories } from "@/lib/docs";

/** Extract a clean description from markdown — strips headings, bold markers, code fences */
function extractSnippet(content: string): string {
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip headings, empty lines, code fences, bold labels, horizontal rules
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("```")) continue;
    if (trimmed.startsWith("**")) continue;
    if (trimmed.startsWith("---")) continue;
    if (trimmed.startsWith("|")) continue;
    if (trimmed.startsWith("-")) continue;
    if (trimmed.startsWith(">")) continue;
    // Found a real prose line
    return trimmed.replace(/[`*_\[\]]/g, "").slice(0, 140) + (trimmed.length > 140 ? "..." : "");
  }
  return "";
}

export default function DocsIndex() {
  const categories = getCategories();

  return (
    <div className="px-6 sm:px-10 py-10 sm:py-16 max-w-4xl mx-auto">
      <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
        Documentation
      </h1>
      <p className="text-muted-foreground text-base sm:text-lg mb-10 max-w-2xl leading-relaxed">
        TSN compiles a strict subset of TypeScript to native ARM64 binaries via
        C. Write idiomatic TypeScript. Get predictable native code.
      </p>

      <div className="grid gap-8">
        {categories.map((cat) => (
          <section key={cat.name}>
            <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold mb-3 tracking-tight">
              {cat.label}
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {cat.pages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/docs/${page.slug}`}
                  className="group block p-4 rounded-lg border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all overflow-hidden"
                >
                  <h3 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">
                    {page.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {extractSnippet(page.content)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
