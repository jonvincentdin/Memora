import Link from "next/link";

export function LibraryNavigation({ basePath, page, hasNext }: { basePath: string; page: number; hasNext: boolean }) {
  return <div className="flex justify-end gap-2"><Link aria-disabled={page <= 1} href={page <= 2 ? basePath : `${basePath}?page=${page - 1}`} className={`rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-ink/5"}`}>Previous</Link><Link aria-disabled={!hasNext} href={`${basePath}?page=${page + 1}`} className={`rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink ${!hasNext ? "pointer-events-none opacity-40" : "hover:bg-ink/5"}`}>Next</Link></div>;
}
