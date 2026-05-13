import { handleZodError, jsonError, jsonOk } from "@/lib/http";
import { registerSchema } from "@/lib/validators";
import { createUser, ensureUserDefaultProject } from "@/server/services/user-service";

export async function POST(req: Request) {
  try {
    const body = registerSchema.parse(await req.json());
    const user = await createUser(body);
    await ensureUserDefaultProject(user.id);
    return jsonOk({ user }, 201);
  } catch (e) {
    const z = handleZodError(e);
    if (z) return z;
    if (e instanceof Error && e.message === "EMAIL_TAKEN") {
      return jsonError("Email already registered", 409);
    }
    console.error(e);
    return jsonError("Registration failed", 500);
  }
}
