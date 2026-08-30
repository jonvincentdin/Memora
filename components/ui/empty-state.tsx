import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, secondaryActionLabel, secondaryActionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface/50 px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
        <Icon className="h-6 w-6 text-accent-dark" />
      </div>
      <h3 className="font-display text-lg text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-soft">{description}</p>
      {(actionLabel && actionHref) || (secondaryActionLabel && secondaryActionHref) ? <div className="mt-5 flex flex-wrap justify-center gap-2">
        {actionLabel && actionHref && <Link
            href={actionHref}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-action px-4 text-sm font-medium text-action-foreground transition-colors hover:bg-action/90"
          >
            {actionLabel}
          </Link>}
        {secondaryActionLabel && secondaryActionHref && <Link
            href={secondaryActionHref}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent-soft"
          >
            {secondaryActionLabel}
          </Link>}
      </div> : null}
    </div>
  );
}
