import { checkDemoKey, guardResponse } from "@/lib/guard";
import { llmErrorResponse } from "@/lib/llm";
import { tokens } from "@/lib/tokens";
import type { Audit, Direction } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    checkDemoKey(req);
  } catch (e) {
    return guardResponse(e)!;
  }
  const body = (await req.json().catch(() => null)) as { direction?: Direction; audit?: Audit } | null;
  if (!body?.direction || !body.audit) {
    return Response.json({ error: { code: "bad_request", message: "Missing direction or audit" } }, { status: 400 });
  }
  try {
    return Response.json(await tokens(body.direction, body.audit));
  } catch (e) {
    return llmErrorResponse(e);
  }
}
