import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

const variants = {
  default: "border-sky-500/30 bg-sky-500/10 text-sky-100",
  outline: "border-[var(--color-border)] bg-transparent text-slate-200",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  danger: "border-rose-500/40 bg-rose-500/10 text-rose-100",
  muted: "border-slate-600/50 bg-slate-800/40 text-slate-300",
} as const;

export function Badge({
  className,
  variant = "default",
  ...props
}: ComponentProps<"span"> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
