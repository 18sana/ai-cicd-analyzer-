import { useQuery } from "@tanstack/react-query";
import type { DashboardStats, NotificationItem, ProjectListItem } from "@/types/api";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => fetchJson<DashboardStats>("/api/dashboard/stats"),
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchJson<ProjectListItem[]>("/api/projects"),
  });
}

export function useActivity(projectId?: string) {
  return useQuery({
    queryKey: ["activity", projectId ?? "all"],
    queryFn: () => {
      const q = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
      return fetchJson<unknown[]>(`/api/activity${q}`);
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchJson<{ items: NotificationItem[] }>("/api/notifications"),
    select: (data) => data.items,
  });
}
