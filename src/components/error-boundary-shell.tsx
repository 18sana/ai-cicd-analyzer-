"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };

type State = { error: Error | null };

export class ErrorBoundaryShell extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI error boundary:", error, info);
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 py-16">
          <h1 className="text-2xl font-semibold text-white">Something went wrong</h1>
          <p className="text-slate-300">
            FlowPilot hit an unexpected error. Try refreshing the page. If this keeps happening,
            check server logs for details.
          </p>
          <pre className="overflow-auto rounded-lg border border-[var(--color-border)] bg-black/40 p-3 text-xs text-rose-200">
            {this.state.error.message}
          </pre>
          <Button type="button" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
