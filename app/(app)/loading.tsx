export default function AppLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse" aria-label="Loading page">
      <div className="h-7 w-48 rounded bg-ink/10" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-ink/5" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-28 rounded-xl border border-line bg-surface" />
        ))}
      </div>
    </div>
  );
}
