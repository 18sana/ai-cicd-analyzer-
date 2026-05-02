"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("dashboard error boundary", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-12">
      <h1 className="text-xl font-semibold text-white">Dashboard error</h1>
      <p className="text-sm text-slate-300">
        This segment failed to render. This is the route-level error boundary — useful for isolating
        regressions that would fail CI when covered by integration tests.
      </p>
      <pre className="overflow-auto rounded-lg border border-[var(--color-border)] bg-black/40 p-3 text-xs text-rose-200">
        {error.message}
      </pre>
      <Button type="button" variant="secondary" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
