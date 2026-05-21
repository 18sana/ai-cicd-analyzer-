import { auth } from "@/auth-invalid-nonexistent-path";
import { ButtonLink } from "@/components/ui/button-link";

export default async function HomePage() {
  const session = await auth();
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-sky-300/90">FlowPilot</p>
          <h1 className="mt-2 text-balance text-4xl font-semibold text-white sm:text-5xl">
            Ship faster with a calm, focused developer workspace.
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-lg text-slate-300">
            Projects, tasks, collaboration, and activity in one place — built with Next.js 15,
            Prisma, and Auth.js for production-grade workflows.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {session?.user ? (
            <ButtonLink href="/dashboard">Open dashboard</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="secondary">
                Log in
              </ButtonLink>
              <ButtonLink href="/register">Create account</ButtonLink>
            </>
          )}
        </div>
      </header>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Task intelligence",
            body: "Priorities, statuses, due dates, and comments that stay close to the code context.",
          },
          {
            title: "Team signal",
            body: "Activity logs and notifications keep everyone aligned without noisy channels.",
          },
          {
            title: "API-first",
            body: "REST routes with validation and structured errors — ready for CI and integrations.",
          },
        ].map((c) => (
          <article
            key={c.title}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-lg shadow-sky-500/5"
          >
            <h2 className="text-lg font-semibold text-white">{c.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{c.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
