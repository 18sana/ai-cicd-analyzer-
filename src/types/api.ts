export type DashboardStats = {
  projectCount: number;
  taskCount: number;
  openTasks: number;
  overdue: number;
  byStatus: Record<string, number>;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type ProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  _count: { tasks: number; members: number };
};
