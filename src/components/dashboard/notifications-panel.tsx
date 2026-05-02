"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDashboardUi } from "@/stores/dashboard-ui";
import { useNotifications } from "@/hooks/use-flow-queries";
import { cn } from "@/lib/utils";

export function NotificationsPanel() {
  const { notificationsOpen } = useDashboardUi();
  const qc = useQueryClient();
  const { data, isLoading } = useNotifications();

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark read");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (!notificationsOpen) return null;

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/90">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Notifications
        </p>
        {isLoading ? (
          <p className="mt-2 text-sm text-slate-400">Loading…</p>
        ) : !data?.length ? (
          <p className="mt-2 text-sm text-slate-400">You are all caught up.</p>
        ) : (
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {data.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "rounded-xl border border-[var(--color-border)] bg-black/20 p-3 text-sm",
                  !n.read && "border-sky-500/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">{n.title}</p>
                    <p className="mt-1 text-slate-300">{n.body}</p>
                  </div>
                  {!n.read ? (
                    <button
                      type="button"
                      className="shrink-0 text-xs text-sky-300 hover:text-sky-200"
                      onClick={() => markRead.mutate(n.id)}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
