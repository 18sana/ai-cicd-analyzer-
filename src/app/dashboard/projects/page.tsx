"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ProjectListItem } from "@/types/api";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export default function ProjectsPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load projects");
      return res.json() as Promise<ProjectListItem[]>;
    },
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: () => postJson<ProjectListItem>("/api/projects", { name, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "stats"] });
      setName("");
      setDescription("");
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Projects</h1>
        <p className="mt-1 text-sm text-slate-400">Create workspaces and drill into tasks.</p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-white">New project</h2>
        <form
          className="mt-4 grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="md:col-span-2">
            <Button type="submit" disabled={create.isPending || !name.trim()}>
              {create.isPending ? "Creating…" : "Create project"}
            </Button>
            {create.isError ? (
              <p className="mt-2 text-sm text-rose-200">{(create.error as Error).message}</p>
            ) : null}
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-white">Your projects</h2>
        {isLoading ? <p className="mt-3 text-sm text-slate-400">Loading…</p> : null}
        {isError ? <p className="mt-3 text-sm text-rose-200">{(error as Error).message}</p> : null}
        <ul className="mt-4 space-y-2">
          {(data ?? []).map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-black/20 px-3 py-2"
            >
              <div>
                <p className="font-medium text-white">{p.name}</p>
                <p className="text-xs text-slate-400">{p.slug}</p>
              </div>
              <Link href={`/dashboard/projects/${p.id}`} className="text-sm text-sky-300">
                Manage
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
