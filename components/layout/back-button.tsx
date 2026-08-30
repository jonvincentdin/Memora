"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => window.history.length > 1 ? router.back() : router.push("/dashboard")}
      aria-label="Go to previous page"
      title="Previous page"
      className="mb-4 inline-flex text-ink-soft transition-colors hover:text-accent-dark focus-visible:text-accent-dark"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
