import { auth } from "@/auth";
import { handleZodError, jsonError, jsonOk } from "@/lib/http";
import { projectUpdateSchema } from "@/lib/validators";
import { deleteProject, getProject, updateProject } from "@/server/services/flow-service";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_req: Request, ctx: Params) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);
  const { projectId } = await ctx.params;
  const project = await getProject(session.user.id, projectId);
  if (!project) return jsonError("Not found", 404);
  return jsonOk(project);
}

export async function PATCH(req: Request, ctx: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);
    const { projectId } = await ctx.params;
    const body = projectUpdateSchema.parse(await req.json());
    const updated = await updateProject(session.user.id, projectId, body);
    if (!updated) return jsonError("Forbidden", 403);
    return jsonOk(updated);
  } catch (e) {
    const z = handleZodError(e);
    if (z) return z;
    console.error(e);
    return jsonError("Failed to update project", 500);
  }
}

export async function DELETE(_req: Request, ctx: Params) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);
  const { projectId } = await ctx.params;
  const ok = await deleteProject(session.user.id, projectId);
  if (!ok) return jsonError("Forbidden", 403);
  return jsonOk({ ok: true });
}
