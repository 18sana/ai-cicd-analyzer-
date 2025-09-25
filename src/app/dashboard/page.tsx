"use client";

import { Card } from "@/components/ui/card";
import { useActivity, useDashboardStats, useProjects } from "@/hooks/use-flow-queries";
import Link from "next/link";

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </Card>
  );
}

export default function DashboardHomePage() {
  const stats = useDashboardStats();
  const projects = useProjects();
  const activity = useActivity();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Analytics, projects, and team activity — wired through REST + TanStack Query.
        </p>
      </div>

      {stats.isError ? (
        <Card className="border-rose-500/40 bg-rose-500/5 p-4 text-sm text-rose-100">
          Could not load stats: {(stats.error as Error).message}
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Projects" value={stats.data?.projectCount ?? 0} />
        <Stat label="Tasks" value={stats.data?.taskCount ?? 0} />
        <Stat label="Open tasks" value={stats.data?.openTasks ?? 0} hint="Excludes Done" />
        <Stat label="Overdue" value={stats.data?.overdue ?? 0} hint="Open with past due date" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Projects</h2>
            <Link href="/dashboard/projects" className="text-xs text-sky-300">
              View all
            </Link>
          </div>
          {projects.isLoading ? (
            <p className="mt-3 text-sm text-slate-400">Loading projects…</p>
          ) : projects.isError ? (
            <p className="mt-3 text-sm text-rose-200">{(projects.error as Error).message}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {(projects.data ?? []).slice(0, 5).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-black/20 px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-white">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      {p._count.tasks} tasks · {p._count.members} members
                    </p>
                  </div>
                  <Link href={`/dashboard/projects/${p.id}`} className="text-xs text-sky-300">
                    Open
                  </Link>
                </li>
              ))}
              {!projects.data?.length ? (
                <p className="text-sm text-slate-400">No projects yet. Create one from Projects.</p>
              ) : null}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-white">Team activity</h2>
          {activity.isLoading ? (
            <p className="mt-3 text-sm text-slate-400">Loading activity…</p>
          ) : activity.isError ? (
            <p className="mt-3 text-sm text-rose-200">{(activity.error as Error).message}</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {(
                activity.data as {
                  id: string;
                  message: string;
                  createdAt: string;
                  user?: { name?: string | null };
                }[]
              ).map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-[var(--color-border)] bg-black/20 px-3 py-2"
                >
                  <p className="text-slate-100">{a.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {a.user?.name ?? "Teammate"} · {new Date(a.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
              {!(activity.data as unknown[] | undefined)?.length ? (
                <p className="text-slate-400">No recent activity.</p>
              ) : null}
            </ul>
          )}
        </Card>
      </section>

      <Card>
        <h2 className="text-lg font-semibold text-white">Task statistics by status</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"].map((key) => (
            <div
              key={key}
              className="rounded-lg border border-[var(--color-border)] bg-black/20 p-3"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {key.replace("_", " ")}
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {stats.data?.byStatus?.[key as keyof typeof stats.data.byStatus] ?? 0}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
