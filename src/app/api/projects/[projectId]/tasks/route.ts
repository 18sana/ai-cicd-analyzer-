import { auth } from "@/auth";
import { handleZodError, jsonError, jsonOk } from "@/lib/http";
import { taskCreateSchema } from "@/lib/validators";
import { createTask, listTasks } from "@/server/services/flow-service";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_req: Request, ctx: Params) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);
  const { projectId } = await ctx.params;
  const tasks = await listTasks(session.user.id, projectId);
  if (tasks === null) return jsonError("Not found", 404);
  return jsonOk(tasks);
}

export async function POST(req: Request, ctx: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);
    const { projectId } = await ctx.params;
    const body = taskCreateSchema.parse(await req.json());
    const task = await createTask(session.user.id, projectId, body);
    if (!task) return jsonError("Not found", 404);
    return jsonOk(task, 201);
  } catch (e) {
    const z = handleZodError(e);
    if (z) return z;
    console.error(e);
    return jsonError("Failed to create task", 500);
  }
}
