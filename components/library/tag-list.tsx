interface ResourceTag {
  id: string;
  name: string;
  color: string | null;
}

export function TagList({ tags, className = "" }: { tags: ResourceTag[]; className?: string }) {
  if (tags.length === 0) return null;

  return (
    <div className={`mt-3 flex flex-wrap gap-1.5 ${className}`} aria-label="Tags">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink-soft"
        >
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color ?? "#d99a2b" }} />
          <span className="truncate">{tag.name}</span>
        </span>
      ))}
    </div>
  );
}
