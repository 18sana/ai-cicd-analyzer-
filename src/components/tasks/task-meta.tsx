import { Badge } from "@/components/ui/badge";

type TaskStatus = "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

const statusLabel: Record<TaskStatus, string> = {
  BACKLOG: "Backlog",
  IN_PROGRESS: "In progress",
  REVIEW: "Review",
  DONE: "Done",
};

const priorityVariant: Record<TaskPriority, "default" | "warning" | "danger" | "muted"> = {
  LOW: "muted",
  MEDIUM: "default",
  HIGH: "warning",
  URGENT: "danger",
};

export function TaskMeta({ status, priority }: { status: TaskStatus; priority: TaskPriority }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline">{statusLabel[status]}</Badge>
      <Badge variant={priorityVariant[priority]}>{priority}</Badge>
    </div>
  );
}
