import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

const variants = {
  primary:
    "bg-sky-500 text-slate-950 hover:bg-sky-400 active:bg-sky-600 shadow-sm shadow-sky-500/30",
  secondary:
    "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-slate-100 hover:bg-slate-800/80",
  ghost: "bg-transparent text-slate-200 hover:bg-white/5",
  danger: "bg-rose-600 text-white hover:bg-rose-500",
} as const;

export function buttonClassName(variant: keyof typeof variants = "primary", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} {...props} />;
}
