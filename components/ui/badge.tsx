import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ink/5 text-ink-soft",
  accent: "bg-accent-soft text-accent-dark",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
};

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", toneClasses[tone], className)}
      {...props}
    />
  );
}
