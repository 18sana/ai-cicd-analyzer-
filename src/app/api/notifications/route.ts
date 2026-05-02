import { auth } from "@/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { listNotifications, markNotificationRead } from "@/server/services/flow-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);
  const items = await listNotifications(session.user.id);
  return jsonOk({ items });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);
  const body = (await req.json()) as { id?: string };
  if (!body.id) return jsonError("id required", 400);
  const updated = await markNotificationRead(session.user.id, body.id);
  if (!updated) return jsonError("Not found", 404);
  return jsonOk(updated);
}
