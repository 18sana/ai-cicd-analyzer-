import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function createUser(input: { email: string; password: string; name?: string }) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("EMAIL_TAKEN");
  }
  const password = await hash(input.password, 12);
  return prisma.user.create({
    data: {
      email,
      password,
      name: input.name ?? email.split("@")[0],
    },
    select: { id: true, email: true, name: true },
  });
}

export async function ensureUserDefaultProject(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  const slugBase = slugify(`${user.name ?? "user"}-workspace`);
  let slug = slugBase;
  let n = 1;
  while (await prisma.project.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${n++}`;
  }
  const project = await prisma.project.create({
    data: {
      name: `${user.name ?? "My"} workspace`,
      description: "Your default FlowPilot project",
      slug,
      ownerId: userId,
      members: { create: { userId, role: "owner" } },
    },
  });
  await prisma.activityLog.create({
    data: {
      action: "PROJECT_CREATED",
      message: `Created project ${project.name}`,
      userId,
      projectId: project.id,
    },
  });
  return project;
}
