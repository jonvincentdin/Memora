import { Tag } from "lucide-react";

interface ResourceTag {
  id: string;
  name: string;
}

export function TagList({ tags, className = "" }: { tags: ResourceTag[]; className?: string }) {
  if (tags.length === 0) return null;

  return (
    <div className={`mt-3 flex flex-wrap gap-1.5 ${className}`} aria-label="Tags">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex max-w-full items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-dark"
        >
          <Tag className="h-3 w-3 shrink-0" />
          <span className="truncate">{tag.name}</span>
        </span>
      ))}
    </div>
  );
}
