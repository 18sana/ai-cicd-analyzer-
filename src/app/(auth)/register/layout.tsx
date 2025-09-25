import { Suspense } from "react";

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-300">Loading…</div>}>
      {children}
    </Suspense>
  );
}
