import { auth } from "@/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { dashboardStats } from "@/server/services/flow-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);
  const stats = await dashboardStats(session.user.id);
  return jsonOk(stats);
}
