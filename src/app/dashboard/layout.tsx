import { auth } from "@/auth";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <div className="min-h-screen">
      <DashboardNav email={session?.user?.email} />
      <NotificationsPanel />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
