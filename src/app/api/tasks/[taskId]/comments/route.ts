import { auth } from "@/auth";
import { handleZodError, jsonError, jsonOk } from "@/lib/http";
import { commentCreateSchema } from "@/lib/validators";
import { addComment, listComments } from "@/server/services/flow-service";

type Params = { params: Promise<{ taskId: string }> };

export async function GET(_req: Request, ctx: Params) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);
  const { taskId } = await ctx.params;
  const comments = await listComments(session.user.id, taskId);
  if (comments === null) return jsonError("Not found", 404);
  return jsonOk(comments);
}

export async function POST(req: Request, ctx: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);
    const { taskId } = await ctx.params;
    const body = commentCreateSchema.parse(await req.json());
    const comment = await addComment(session.user.id, taskId, body.body);
    if (!comment) return jsonError("Not found", 404);
    return jsonOk(comment, 201);
  } catch (e) {
    const z = handleZodError(e);
    if (z) return z;
    console.error(e);
    return jsonError("Failed to add comment", 500);
  }
}
