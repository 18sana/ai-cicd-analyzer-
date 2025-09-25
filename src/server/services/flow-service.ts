import { ActivityAction, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

async function assertProjectAccess(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
  });
  if (!project) return null;
  return project;
}

export async function listProjectsForUser(userId: string) {
  return prisma.project.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { tasks: true, members: true } },
    },
  });
}

export async function createProject(userId: string, input: { name: string; description?: string }) {
  const slugBase = slugify(input.name);
  let slug = slugBase;
  let n = 1;
  while (await prisma.project.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${n++}`;
  }
  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      slug,
      ownerId: userId,
      members: { create: { userId, role: "owner" } },
    },
  });
  await prisma.activityLog.create({
    data: {
      action: ActivityAction.PROJECT_CREATED,
      message: `Created project ${project.name}`,
      userId,
      projectId: project.id,
    },
  });
  return project;
}

export async function getProject(userId: string, projectId: string) {
  return assertProjectAccess(userId, projectId);
}

export async function updateProject(
  userId: string,
  projectId: string,
  input: { name?: string; description?: string },
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
  });
  if (!project) return null;
  return prisma.project.update({
    where: { id: projectId },
    data: {
      name: input.name ?? undefined,
      description: input.description === undefined ? undefined : input.description,
    },
  });
}

export async function deleteProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
  });
  if (!project) return false;
  await prisma.project.delete({ where: { id: projectId } });
  return true;
}

export async function listTasks(userId: string, projectId: string) {
  const ok = await assertProjectAccess(userId, projectId);
  if (!ok) return null;
  return prisma.task.findMany({
    where: { projectId },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { comments: true } },
    },
  });
}

export async function createTask(
  userId: string,
  projectId: string,
  input: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: Date | null;
    assigneeId?: string | null;
  },
) {
  const ok = await assertProjectAccess(userId, projectId);
  if (!ok) return null;

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description,
      status: input.status ?? TaskStatus.BACKLOG,
      priority: input.priority ?? TaskPriority.MEDIUM,
      dueDate: input.dueDate ?? undefined,
      assigneeId: input.assigneeId ?? undefined,
      projectId,
      createdById: userId,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: ActivityAction.TASK_CREATED,
      message: `Created task “${task.title}”`,
      userId,
      projectId,
      taskId: task.id,
    },
  });

  await prisma.notification.create({
    data: {
      userId,
      title: "Task created",
      body: `“${task.title}” was added to ${ok.name}.`,
    },
  });

  return task;
}

export async function getTask(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task) return null;
  const ok = await assertProjectAccess(userId, task.projectId);
  if (!ok) return null;
  return task;
}

export async function updateTask(
  userId: string,
  taskId: string,
  input: Partial<{
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date | null;
    assigneeId: string | null;
  }>,
) {
  const existing = await getTask(userId, taskId);
  if (!existing) return null;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: input.title,
      description: input.description === undefined ? undefined : input.description,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate === undefined ? undefined : input.dueDate,
      assigneeId: input.assigneeId === undefined ? undefined : input.assigneeId,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: ActivityAction.TASK_UPDATED,
      message: `Updated task “${task.title}”`,
      userId,
      projectId: existing.projectId,
      taskId: task.id,
    },
  });

  return task;
}

export async function deleteTask(userId: string, taskId: string) {
  const existing = await getTask(userId, taskId);
  if (!existing) return false;
  await prisma.task.delete({ where: { id: taskId } });
  await prisma.activityLog.create({
    data: {
      action: ActivityAction.TASK_DELETED,
      message: `Deleted task “${existing.title}”`,
      userId,
      projectId: existing.projectId,
    },
  });
  return true;
}

export async function listComments(userId: string, taskId: string) {
  const task = await getTask(userId, taskId);
  if (!task) return null;
  return prisma.comment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });
}

export async function addComment(userId: string, taskId: string, body: string) {
  const task = await getTask(userId, taskId);
  if (!task) return null;
  const comment = await prisma.comment.create({
    data: { body, taskId, userId },
  });
  await prisma.activityLog.create({
    data: {
      action: ActivityAction.COMMENT_ADDED,
      message: `Commented on “${task.title}”`,
      userId,
      projectId: task.projectId,
      taskId,
    },
  });
  return comment;
}

export async function listActivity(userId: string, projectId?: string) {
  if (projectId) {
    const ok = await assertProjectAccess(userId, projectId);
    if (!ok) return null;
    return prisma.activityLog.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });
  }

  const projects = await prisma.project.findMany({
    where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    select: { id: true },
  });
  const ids = projects.map((p) => p.id);
  return prisma.activityLog.findMany({
    where: { projectId: { in: ids } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      project: { select: { id: true, name: true } },
    },
  });
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const n = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!n) return null;
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

export async function dashboardStats(userId: string) {
  const projects = await prisma.project.findMany({
    where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) {
    return {
      projectCount: 0,
      taskCount: 0,
      openTasks: 0,
      overdue: 0,
      byStatus: {} as Record<TaskStatus, number>,
    };
  }

  const now = new Date();
  const [taskCount, openTasks, overdue, grouped] = await Promise.all([
    prisma.task.count({ where: { projectId: { in: projectIds } } }),
    prisma.task.count({
      where: { projectId: { in: projectIds }, status: { not: TaskStatus.DONE } },
    }),
    prisma.task.count({
      where: {
        projectId: { in: projectIds },
        status: { not: TaskStatus.DONE },
        dueDate: { lt: now },
      },
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId: { in: projectIds } },
      _count: { _all: true },
    }),
  ]);

  const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Record<
    TaskStatus,
    number
  >;

  return {
    projectCount: projectIds.length,
    taskCount,
    openTasks,
    overdue,
    byStatus,
  };
}
