export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-3 py-10" role="status" aria-label={label}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 w-full animate-pulse rounded-card bg-ink/5" />
      ))}
    </div>
  );
}
