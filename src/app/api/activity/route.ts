import { auth } from "@/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { listActivity } from "@/server/services/flow-service";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId") ?? undefined;
  const activity = await listActivity(session.user.id, projectId);
  if (activity === null) return jsonError("Not found", 404);
  return jsonOk(activity);
}
