import { notFound } from "next/navigation";
import { getDocBySlug, getAllSlugs } from "@/lib/docs";
import { DocRenderer } from "@/components/doc-renderer";
import { TableOfContents } from "@/components/table-of-contents";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug: [slug] }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const doc = getDocBySlug(slug[0]);
  if (!doc) return { title: "Not Found" };
  return { title: doc.title };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const doc = getDocBySlug(slug[0]);
  if (!doc) notFound();

  // Strip leading "# Title" from markdown since the page renders the title
  const content = doc.content.replace(/^#\s+.*\n+/, "");

  return (
    <div className="flex gap-10 px-6 sm:px-10 py-10 sm:py-16 max-w-6xl mx-auto">
      <article className="flex-1 min-w-0">
        <div className="mb-8">
          <span className="text-xs font-medium uppercase tracking-widest text-accent">
            {doc.category}
          </span>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
            {doc.title}
          </h1>
        </div>
        <div className="prose">
          <DocRenderer content={content} />
        </div>
      </article>

      <TableOfContents content={content} />
    </div>
  );
}
