"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDashboardUi } from "@/stores/dashboard-ui";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/projects", label: "Projects" },
];

export function DashboardNav({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const { notificationsOpen, toggleNotifications } = useDashboardUi();

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-white">
            FlowPilot
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white",
                  pathname === l.href && "bg-white/10 text-white",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={toggleNotifications}>
            {notificationsOpen ? "Hide" : "Show"} alerts
          </Button>
          <span className="hidden text-xs text-slate-400 sm:inline">{email}</span>
          <Button type="button" variant="secondary" onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
