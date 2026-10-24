import { direction } from "@/lib/direction";
import { checkDemoKey, guardResponse } from "@/lib/guard";
import { llmErrorResponse } from "@/lib/llm";
import type { Audit, Content } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    checkDemoKey(req);
  } catch (e) {
    return guardResponse(e)!;
  }
  const body = (await req.json().catch(() => null)) as { audit?: Audit; content?: Content; viewport?: string } | null;
  if (!body?.audit || !body.content || !body.viewport) {
    return Response.json({ error: { code: "bad_request", message: "Missing audit, content or viewport" } }, { status: 400 });
  }
  try {
    const base64 = body.viewport.replace(/^data:image\/\w+;base64,/, "");
    return Response.json(await direction(body.audit, body.content, base64));
  } catch (e) {
    return llmErrorResponse(e);
  }
}
