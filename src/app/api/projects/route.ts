import { auth } from "@/auth";
import { handleZodError, jsonError, jsonOk } from "@/lib/http";
import { projectCreateSchema } from "@/lib/validators";
import { createProject, listProjectsForUser } from "@/server/services/flow-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);
  const projects = await listProjectsForUser(session.user.id);
  return jsonOk(projects);
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);
    const body = projectCreateSchema.parse(await req.json());
    const project = await createProject(session.user.id, body);
    return jsonOk(project, 201);
  } catch (e) {
    const z = handleZodError(e);
    if (z) return z;
    console.error(e);
    return jsonError("Failed to create project", 500);
  }
}
