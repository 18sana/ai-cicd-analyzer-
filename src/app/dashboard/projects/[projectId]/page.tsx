"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TaskMeta } from "@/components/tasks/task-meta";

const TASK_STATUSES = ["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"] as const;
const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

type TaskStatus = (typeof TASK_STATUSES)[number];
type TaskPriority = (typeof TASK_PRIORITIES)[number];

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignee: { name: string | null; email: string } | null;
  _count: { comments: number };
};

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { credentials: "include", ...init });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const qc = useQueryClient();

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () =>
      jsonFetch<{ id: string; name: string; description: string | null }>(
        `/api/projects/${projectId}`,
      ),
    enabled: Boolean(projectId),
  });

  const tasks = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => jsonFetch<TaskRow[]>(`/api/projects/${projectId}/tasks`),
    enabled: Boolean(projectId),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("BACKLOG");

  const createTask = useMutation({
    mutationFn: () =>
      jsonFetch<TaskRow>(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority, status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "stats"] });
      setTitle("");
      setDescription("");
    },
  });

  const deleteTask = useMutation({
    mutationFn: (taskId: string) =>
      jsonFetch<{ ok: boolean }>(`/api/tasks/${taskId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["dashboard", "stats"] });
    },
  });

  const taskIds = useMemo(() => (tasks.data ?? []).map((t) => t.id), [tasks.data]);
  const [activeTask, setActiveTask] = useState<string | null>(null);

  if (!projectId) {
    return <p className="text-sm text-rose-200">Missing project id.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/dashboard/projects" className="text-xs text-slate-400">
            ← Projects
          </Link>
          {project.isLoading ? (
            <h1 className="mt-2 text-2xl font-semibold text-white">Loading…</h1>
          ) : project.isError ? (
            <h1 className="mt-2 text-2xl font-semibold text-rose-200">
              {(project.error as Error).message}
            </h1>
          ) : (
            <>
              <h1 className="mt-2 text-2xl font-semibold text-white">{project.data?.name}</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">{project.data?.description}</p>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-white">Create task</h2>
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              createTask.mutate();
            }}
          >
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Input
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-200">
                <span className="font-medium">Priority</span>
                <select
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-slate-100"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                >
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-200">
                <span className="font-medium">Status</span>
                <select
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-slate-100"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Button type="submit" disabled={createTask.isPending || !title.trim()}>
              {createTask.isPending ? "Saving…" : "Add task"}
            </Button>
            {createTask.isError ? (
              <p className="text-sm text-rose-200">{(createTask.error as Error).message}</p>
            ) : null}
          </form>
        </Card>

        <TaskCommentsCard
          projectId={projectId}
          taskIds={taskIds}
          activeTask={activeTask}
          setActiveTask={setActiveTask}
        />
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-white">Tasks</h2>
        {tasks.isLoading ? <p className="mt-3 text-sm text-slate-400">Loading tasks…</p> : null}
        {tasks.isError ? (
          <p className="mt-3 text-sm text-rose-200">{(tasks.error as Error).message}</p>
        ) : null}
        <ul className="mt-4 space-y-3">
          {(tasks.data ?? []).map((t) => (
            <li
              key={t.id}
              className="rounded-xl border border-[var(--color-border)] bg-black/20 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{t.title}</p>
                  {t.description ? (
                    <p className="mt-1 text-sm text-slate-300">{t.description}</p>
                  ) : null}
                  <div className="mt-2">
                    <TaskMeta status={t.status} priority={t.priority} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Assignee: {t.assignee?.name ?? t.assignee?.email ?? "Unassigned"} · Due:{" "}
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"} · Comments:{" "}
                    {t._count.comments}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setActiveTask((cur) => (cur === t.id ? null : t.id))}
                  >
                    {activeTask === t.id ? "Hide comments" : "Comments"}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => {
                      if (confirm("Delete this task?")) deleteTask.mutate(t.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              {activeTask === t.id ? (
                <InlineTaskEditor projectId={projectId} taskId={t.id} />
              ) : null}
            </li>
          ))}
          {!tasks.data?.length ? <p className="text-sm text-slate-400">No tasks yet.</p> : null}
        </ul>
      </Card>
    </div>
  );
}

function InlineTaskEditor({ projectId, taskId }: { projectId: string; taskId: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priority, setPriority] = useState<TaskPriority | "">("");

  const patch = useMutation({
    mutationFn: () =>
      jsonFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(status ? { status } : {}),
          ...(priority ? { priority } : {}),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });

  return (
    <div className="mt-4 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">Quick update</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-slate-300">
          Status
          <select
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-black/30 px-2 py-1 text-sm text-white"
            value={status}
            onChange={(e) => setStatus((e.target.value || "") as TaskStatus | "")}
          >
            <option value="">(unchanged)</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-300">
          Priority
          <select
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-black/30 px-2 py-1 text-sm text-white"
            value={priority}
            onChange={(e) => setPriority((e.target.value || "") as TaskPriority | "")}
          >
            <option value="">(unchanged)</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Button
        type="button"
        className="mt-3"
        variant="secondary"
        disabled={patch.isPending || (!status && !priority)}
        onClick={() => patch.mutate()}
      >
        {patch.isPending ? "Saving…" : "Apply"}
      </Button>
    </div>
  );
}

function TaskCommentsCard({
  projectId,
  taskIds,
  activeTask,
  setActiveTask,
}: {
  projectId: string;
  taskIds: string[];
  activeTask: string | null;
  setActiveTask: (id: string | null) => void;
}) {
  const qc = useQueryClient();
  const taskId = activeTask ?? taskIds[0] ?? null;
  const comments = useQuery({
    queryKey: ["comments", taskId],
    queryFn: () =>
      jsonFetch<{ id: string; body: string; createdAt: string; user: { name: string | null } }[]>(
        `/api/tasks/${taskId}/comments`,
      ),
    enabled: Boolean(taskId),
  });

  const [body, setBody] = useState("");

  const add = useMutation({
    mutationFn: () =>
      jsonFetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      setBody("");
    },
  });

  if (!taskIds.length) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-white">Comments</h2>
        <p className="mt-2 text-sm text-slate-400">Create a task to start a thread.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Comments</h2>
        <label className="text-xs text-slate-400">
          Task
          <select
            className="ml-2 rounded-md border border-[var(--color-border)] bg-black/30 px-2 py-1 text-xs text-white"
            value={taskId ?? ""}
            onChange={(e) => setActiveTask(e.target.value)}
          >
            {taskIds.map((id) => (
              <option key={id} value={id}>
                {id.slice(0, 8)}…
              </option>
            ))}
          </select>
        </label>
      </div>

      {comments.isLoading ? <p className="mt-3 text-sm text-slate-400">Loading comments…</p> : null}
      {comments.isError ? (
        <p className="mt-3 text-sm text-rose-200">{(comments.error as Error).message}</p>
      ) : null}

      <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm">
        {(comments.data ?? []).map((c) => (
          <li key={c.id} className="rounded-lg border border-[var(--color-border)] bg-black/20 p-2">
            <p className="text-slate-100">{c.body}</p>
            <p className="mt-1 text-xs text-slate-500">
              {c.user.name ?? "User"} · {new Date(c.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>

      <form
        className="mt-3 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!taskId) return;
          add.mutate();
        }}
      >
        <Input
          label="New comment"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <Button type="submit" disabled={add.isPending || !body.trim() || !taskId}>
          {add.isPending ? "Posting…" : "Post comment"}
        </Button>
      </form>
    </Card>
  );
}
