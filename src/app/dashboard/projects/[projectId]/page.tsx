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
  assignee: { id: string; name: string | null; email: string; image?: string | null } | null;
  _count: { comments: number };
};

type ProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  members: {
    role: string;
    joinedAt: string;
    user: { id: string; name: string | null; email: string; image: string | null };
  }[];
};

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { credentials: "include", ...init });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  return jsonFetch<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const qc = useQueryClient();

  // Tab View State: list | kanban | members
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "members">("list");

  // Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "">("");
  const [filterAssignee, setFilterAssignee] = useState<string | "">("");

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => jsonFetch<ProjectDetail>(`/api/projects/${projectId}`),
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
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const createTask = useMutation({
    mutationFn: () =>
      jsonFetch<TaskRow>(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          status,
          assigneeId: assigneeId || null,
          dueDate: dueDate || null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "stats"] });
      setTitle("");
      setDescription("");
      setAssigneeId("");
      setDueDate("");
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

  // Filter tasks reactively
  const filteredTasks = useMemo(() => {
    return (tasks.data ?? []).filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesPriority = filterPriority === "" || t.priority === filterPriority;
      const matchesAssignee = filterAssignee === "" || t.assignee?.id === filterAssignee;
      return matchesSearch && matchesPriority && matchesAssignee;
    });
  }, [tasks.data, searchQuery, filterPriority, filterAssignee]);

  if (!projectId) {
    return <p className="text-sm text-rose-200">Missing project id.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard/projects" className="text-xs text-slate-400 hover:text-white transition-colors">
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

        {/* Tab Controls (Glassmorphism design) */}
        <div className="flex rounded-xl bg-black/40 p-1 border border-white/5 backdrop-blur-md gap-1">
          {(["list", "kanban", "members"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                viewMode === mode
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {mode === "list" ? "📋 List View" : mode === "kanban" ? "📊 Kanban Board" : "👥 Collaborators"}
            </button>
          ))}
        </div>
      </div>

      {/* SEARCH & FILTERS PANEL (only for List and Kanban views) */}
      {viewMode !== "members" && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/5 bg-black/30 p-4 backdrop-blur-md">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Search Tasks
            </label>
            <input
              type="text"
              placeholder="Filter by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Priority
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as TaskPriority | "")}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
            >
              <option value="">All Priorities</option>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Assignee
            </label>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
            >
              <option value="">All Assignees</option>
              {(project.data?.members ?? []).map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name ?? m.user.email}
                </option>
              ))}
            </select>
          </div>
          {(searchQuery || filterPriority || filterAssignee) ? (
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterPriority("");
                setFilterAssignee("");
              }}
              className="self-end mb-2.5 text-xs text-sky-400 hover:text-sky-300 font-medium underline"
            >
              Clear
            </button>
          ) : null}
        </div>
      )}

      {/* DYNAMIC VIEW CONTAINER */}
      {viewMode === "list" && (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
              <h2 className="text-lg font-semibold text-white">Tasks List</h2>
              {tasks.isLoading ? <p className="mt-3 text-sm text-slate-400">Loading tasks…</p> : null}
              {tasks.isError ? (
                <p className="mt-3 text-sm text-rose-200">{(tasks.error as Error).message}</p>
              ) : null}
              <ul className="mt-4 space-y-3">
                {filteredTasks.map((t) => {
                  const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE";
                  return (
                    <li
                      key={t.id}
                      className="rounded-xl border border-[var(--color-border)] bg-black/20 p-4 hover:border-white/10 transition-colors"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">{t.title}</p>
                            {isOverdue ? (
                              <span className="text-[9px] px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-400 animate-pulse font-bold">
                                OVERDUE
                              </span>
                            ) : null}
                          </div>
                          {t.description ? (
                            <p className="mt-1 text-sm text-slate-350">{t.description}</p>
                          ) : null}
                          <div className="mt-2.5">
                            <TaskMeta status={t.status} priority={t.priority} />
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              👤 Assignee: <strong>{t.assignee?.name ?? t.assignee?.email ?? "Unassigned"}</strong>
                            </span>
                            <span>
                              📅 Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                            </span>
                            <span>
                              💬 Comments: {t._count.comments}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 self-center sm:self-start">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setActiveTask((cur) => (cur === t.id ? null : t.id))}
                          >
                            {activeTask === t.id ? "Hide editor" : "⚙️ Quick Edit"}
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
                        <InlineTaskEditor
                          projectId={projectId}
                          taskId={t.id}
                          members={project.data?.members ?? []}
                          currentAssigneeId={t.assignee?.id ?? null}
                          currentDueDate={t.dueDate}
                          currentStatus={t.status}
                          currentPriority={t.priority}
                        />
                      ) : null}
                    </li>
                  );
                })}
                {!filteredTasks.length ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No tasks match your filters.</p>
                ) : null}
              </ul>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
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
                  placeholder="Task title"
                />
                <Input
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details and scope..."
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm text-slate-200">
                    <span className="font-medium">Priority</span>
                    <select
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
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
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
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

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm text-slate-200">
                    <span className="font-medium">Assignee</span>
                    <select
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {(project.data?.members ?? []).map((m) => (
                        <option key={m.user.id} value={m.user.id}>
                          {m.user.name ?? m.user.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-slate-200">
                    <span className="font-medium">Due Date</span>
                    <input
                      type="date"
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500 scheme-dark"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </label>
                </div>

                <Button type="submit" disabled={createTask.isPending || !title.trim()} className="mt-2">
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
        </div>
      )}

      {viewMode === "kanban" && (
        <KanbanBoard
          tasks={filteredTasks}
          projectId={projectId}
          members={project.data?.members ?? []}
        />
      )}

      {viewMode === "members" && project.data && (
        <CollaboratorsTab
          projectData={project.data}
          projectId={projectId}
        />
      )}
    </div>
  );
}

// INLINE TASK EDITOR COMPONENT (extended with Assignee and Due Date)
function InlineTaskEditor({
  projectId,
  taskId,
  members,
  currentAssigneeId,
  currentDueDate,
  currentStatus,
  currentPriority,
}: {
  projectId: string;
  taskId: string;
  members: { role: string; user: { id: string; name: string | null; email: string } }[];
  currentAssigneeId: string | null;
  currentDueDate: string | null;
  currentStatus: TaskStatus;
  currentPriority: TaskPriority;
}) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<TaskStatus>(currentStatus);
  const [priority, setPriority] = useState<TaskPriority>(currentPriority);
  const [assigneeId, setAssigneeId] = useState<string>(currentAssigneeId ?? "");
  const [dueDate, setDueDate] = useState<string>(
    currentDueDate ? new Date(currentDueDate).toISOString().split("T")[0] ?? "" : "",
  );

  const patch = useMutation({
    mutationFn: () =>
      jsonFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priority,
          assigneeId: assigneeId || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });

  const isChanged =
    status !== currentStatus ||
    priority !== currentPriority ||
    assigneeId !== (currentAssigneeId ?? "") ||
    dueDate !== (currentDueDate ? new Date(currentDueDate).toISOString().split("T")[0] ?? "" : "");

  return (
    <div className="mt-4 rounded-lg border border-sky-500/30 bg-sky-500/5 p-4 transition-all duration-300">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">Quick update</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-slate-350">
          Status
          <select
            className="mt-1.5 w-full rounded-md border border-[var(--color-border)] bg-black/45 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
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
        <label className="text-xs text-slate-350">
          Priority
          <select
            className="mt-1.5 w-full rounded-md border border-[var(--color-border)] bg-black/45 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
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
        <label className="text-xs text-slate-350">
          Assignee
          <select
            className="mt-1.5 w-full rounded-md border border-[var(--color-border)] bg-black/45 px-2 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name ?? m.user.email}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-350">
          Due Date
          <input
            type="date"
            className="mt-1.5 w-full rounded-md border border-[var(--color-border)] bg-black/45 px-2 py-1 text-sm text-white scheme-dark focus:outline-none focus:border-sky-500"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>
      </div>
      <Button
        type="button"
        className="mt-4"
        variant="secondary"
        disabled={patch.isPending || !isChanged}
        onClick={() => patch.mutate()}
      >
        {patch.isPending ? "Saving…" : "Apply Changes"}
      </Button>
    </div>
  );
}

// DRAG-AND-DROP STYLE INTERACTIVE KANBAN BOARD
function KanbanBoard({
  tasks,
  projectId,
  members,
}: {
  tasks: TaskRow[];
  projectId: string;
  members: { role: string; user: { id: string; name: string | null; email: string } }[];
}) {
  const qc = useQueryClient();
  const [activeTask, setActiveTask] = useState<string | null>(null);

  const columns = useMemo(() => {
    const groups: Record<TaskStatus, TaskRow[]> = {
      BACKLOG: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
    };
    tasks.forEach((t) => {
      if (groups[t.status]) {
        groups[t.status].push(t);
      }
    });
    return groups;
  }, [tasks]);

  const patchStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      jsonFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["activity"] });
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

  const columnConfig: Record<
    TaskStatus,
    { title: string; borderClass: string; bgClass: string; textClass: string }
  > = {
    BACKLOG: {
      title: "📋 Backlog",
      borderClass: "border-slate-500/20",
      bgClass: "bg-slate-500/5",
      textClass: "text-slate-300",
    },
    IN_PROGRESS: {
      title: "⚡ In Progress",
      borderClass: "border-amber-500/20",
      bgClass: "bg-amber-500/5",
      textClass: "text-amber-300",
    },
    REVIEW: {
      title: "👀 Review",
      borderClass: "border-violet-500/20",
      bgClass: "bg-violet-500/5",
      textClass: "text-violet-300",
    },
    DONE: {
      title: "✅ Done",
      borderClass: "border-emerald-500/20",
      bgClass: "bg-emerald-500/5",
      textClass: "text-emerald-300",
    },
  };

  const handleMove = (task: TaskRow, direction: "left" | "right") => {
    const currentIndex = TASK_STATUSES.indexOf(task.status);
    let nextIndex = currentIndex;
    if (direction === "left") {
      nextIndex = Math.max(0, currentIndex - 1);
    } else {
      nextIndex = Math.min(TASK_STATUSES.length - 1, currentIndex + 1);
    }
    if (nextIndex !== currentIndex) {
      patchStatus.mutate({ taskId: task.id, status: TASK_STATUSES[nextIndex] as TaskStatus });
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case "LOW":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "MEDIUM":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "HIGH":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "URGENT":
        return "bg-red-500/25 text-red-400 border-red-500/40 animate-pulse";
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-start">
      {TASK_STATUSES.map((statusKey) => {
        const column = columnConfig[statusKey];
        const taskList = columns[statusKey];
        return (
          <div
            key={statusKey}
            className={`rounded-2xl border ${column.borderClass} ${column.bgClass} p-4 flex flex-col gap-4 min-h-[550px] backdrop-blur-md`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`font-semibold text-sm uppercase tracking-wider ${column.textClass}`}>
                {column.title}
              </h3>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold bg-white/10 ${column.textClass}`}>
                {taskList.length}
              </span>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto max-h-[70vh] pr-1">
              {taskList.map((t) => {
                const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE";
                const isFirstColumn = statusKey === "BACKLOG";
                const isLastColumn = statusKey === "DONE";

                return (
                  <div
                    key={t.id}
                    className="group rounded-xl border border-white/5 bg-black/45 p-4 hover:border-white/20 transition-all duration-300 shadow-md flex flex-col gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-white group-hover:text-sky-300 transition-colors">
                          {t.title}
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${getPriorityColor(t.priority)}`}>
                          {t.priority}
                        </span>
                      </div>
                      {t.description ? (
                        <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {t.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center text-[10px] font-bold">
                          {t.assignee?.name?.[0]?.toUpperCase() ?? t.assignee?.email?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                          {t.assignee?.name ?? t.assignee?.email?.split("@")[0] ?? "Unassigned"}
                        </span>
                      </div>

                      {t.dueDate ? (
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${
                          isOverdue
                            ? "border-red-500/30 bg-red-500/10 text-red-400 animate-pulse font-bold"
                            : "border-white/10 text-slate-400"
                        }`}>
                          📅 {new Date(t.dueDate).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 mt-1">
                      <div className="flex items-center gap-1">
                        <button
                          disabled={isFirstColumn}
                          onClick={() => handleMove(t, "left")}
                          className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center text-xs text-slate-300 hover:text-white transition-colors"
                          title="Move Left"
                        >
                          ◀
                        </button>
                        <button
                          disabled={isLastColumn}
                          onClick={() => handleMove(t, "right")}
                          className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center text-xs text-slate-300 hover:text-white transition-colors"
                          title="Move Right"
                        >
                          ▶
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setActiveTask((cur) => (cur === t.id ? null : t.id))}
                          className="text-[10px] px-2 py-1.5 rounded hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors font-medium"
                        >
                          {activeTask === t.id ? "Hide Edit" : `⚙️ Edit (${t._count.comments})`}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this task?")) deleteTask.mutate(t.id);
                          }}
                          className="w-7 h-7 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 flex items-center justify-center text-xs transition-colors"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {activeTask === t.id ? (
                      <div className="border-t border-white/5 pt-2">
                        <InlineTaskEditor
                          projectId={projectId}
                          taskId={t.id}
                          members={members}
                          currentAssigneeId={t.assignee?.id ?? null}
                          currentDueDate={t.dueDate}
                          currentStatus={t.status}
                          currentPriority={t.priority}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {!taskList.length ? (
                <div className="rounded-xl border border-dashed border-white/5 p-6 text-center">
                  <p className="text-xs text-slate-500">No tasks</p>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// COLLABORATORS / MEMBER MANAGEMENT TAB COMPONENT
function CollaboratorsTab({
  projectData,
  projectId,
}: {
  projectData: ProjectDetail;
  projectId: string;
}) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const addMember = useMutation({
    mutationFn: () => postJson(`/api/projects/${projectId}/members`, { email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      setEmail("");
      setSuccessMsg("Collaborator added successfully!");
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      setSuccessMsg(null);
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2 flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Project Members</h2>
          <p className="text-sm text-slate-400 mt-1">People with access to this project workspace.</p>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-white/5 text-xs text-slate-400 uppercase tracking-wider border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Joined At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {projectData.members.map((m) => (
                <tr key={m.user.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-500/25 border border-sky-500/40 text-sky-300 flex items-center justify-center font-bold text-xs">
                      {m.user.name?.[0]?.toUpperCase() ?? m.user.email[0]?.toUpperCase() ?? ""}
                    </div>
                    <div>
                      <p className="font-medium text-white">{m.user.name ?? "User"}</p>
                      <p className="text-xs text-slate-500">{m.user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase ${
                      m.role === "owner"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                    }`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">
                    {new Date(m.joinedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Add Collaborator</h2>
          <p className="text-sm text-slate-400 mt-1">Grant access to a registered user.</p>
        </div>

        <form
          className="flex flex-col gap-4 mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            addMember.mutate();
          }}
        >
          <Input
            label="User Email"
            placeholder="collaborator@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
          />

          {errorMsg ? (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
              ⚠️ {errorMsg}
            </p>
          ) : null}

          {successMsg ? (
            <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
              🎉 {successMsg}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={addMember.isPending || !email.trim()}
          >
            {addMember.isPending ? "Adding Collaborator..." : "Add Member"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

// COMMENTS CARD COMPONENT
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
