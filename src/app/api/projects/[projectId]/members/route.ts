import { auth } from "@/auth";
import { handleZodError, jsonError, jsonOk } from "@/lib/http";
import { addProjectMember } from "@/server/services/flow-service";
import { z } from "zod";

const addMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type Params = { params: Promise<{ projectId: string }> };

export async function POST(req: Request, ctx: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Unauthorized", 401);
    }

    const { projectId } = await ctx.params;
    const body = addMemberSchema.parse(await req.json());

    const member = await addProjectMember(
      session.user.id,
      projectId,
      body.email,
    );

    return jsonOk(member, 201);
  } catch (e: unknown) {
    const zError = handleZodError(e);
    if (zError) return zError;

    if (e instanceof Error) {
      if (e.message === "UNAUTHORIZED") {
        return jsonError("Only project owners or administrators can add members.", 403);
      }
      if (e.message === "USER_NOT_FOUND") {
        return jsonError("User not found. They must register for FlowPilot first.", 404);
      }
      if (e.message === "ALREADY_MEMBER") {
        return jsonError("This user is already a member of this project.", 400);
      }
    }

    console.error("Failed to add project member:", e);
    return jsonError("Failed to add collaborator", 500);
  }
}
