import { auth } from "@/auth";
import { handleZodError, jsonError, jsonOk } from "@/lib/http";
import { taskUpdateSchema } from "@/lib/validators";
import { deleteTask, getTask, updateTask } from "@/server/services/flow-service";

type Params = { params: Promise<{ taskId: string }> };

export async function GET(_req: Request, ctx: Params) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);
  const { taskId } = await ctx.params;
  const task = await getTask(session.user.id, taskId);
  if (!task) return jsonError("Not found", 404);
  return jsonOk(task);
}

export async function PATCH(req: Request, ctx: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);
    const { taskId } = await ctx.params;
    const body = taskUpdateSchema.parse(await req.json());
    const task = await updateTask(session.user.id, taskId, body);
    if (!task) return jsonError("Not found", 404);
    return jsonOk(task);
  } catch (e) {
    const z = handleZodError(e);
    if (z) return z;
    console.error(e);
    return jsonError("Failed to update task", 500);
  }
}

export async function DELETE(_req: Request, ctx: Params) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);
  const { taskId } = await ctx.params;
  const ok = await deleteTask(session.user.id, taskId);
  if (!ok) return jsonError("Not found", 404);
  return jsonOk({ ok: true });
}
