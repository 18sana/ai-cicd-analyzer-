import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type Props = ComponentProps<"input"> & {
  label: string;
};

export function Input({ id, label, className, ...props }: Props) {
  const inputId = id ?? props.name ?? label.replace(/\s+/g, "-").toLowerCase();
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-200" htmlFor={inputId}>
      <span className="font-medium">{label}</span>
      <input
        id={inputId}
        className={cn(
          "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-slate-100 outline-none ring-sky-400/40 placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2",
          className,
        )}
        {...props}
      />
    </label>
  );
}
