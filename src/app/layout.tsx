import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/providers";
import { ErrorBoundaryShell } from "@/components/error-boundary-shell";

export const metadata: Metadata = {
  title: {
    default: "FlowPilot",
    template: "%s · FlowPilot",
  },
  description: "Developer productivity platform for tasks, projects, and team flow.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <ErrorBoundaryShell>{children}</ErrorBoundaryShell>
        </Providers>
      </body>
    </html>
  );
}
