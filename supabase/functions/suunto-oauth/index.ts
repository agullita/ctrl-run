import {
  authenticate,
  ensureFreshToken,
  errorResponse,
  exchangeAuthorizationCode,
  getTokenRow,
  handleOptions,
  json,
  saveTokenRow,
} from "../_shared/suunto.ts";

interface RequestBody {
  action?: "status" | "exchange" | "disconnect";
  code?: string;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  const context = await authenticate(req);
  if (!context) return errorResponse("UNAUTHORIZED", 401);

  let body: RequestBody;

  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return errorResponse("INVALID_JSON", 400);
  }

  try {
    if (body.action === "exchange") {
      if (!body.code) return errorResponse("MISSING_AUTHORIZATION_CODE", 400);

      const token = await exchangeAuthorizationCode(body.code);
      const row = await saveTokenRow(context.admin, context.user.id, token);

      return json({
        connected: true,
        username: row.suunto_username,
        expiresAt: row.expires_at,
        scope: row.scope,
      });
    }

    if (body.action === "disconnect") {
      const { error } = await context.admin
        .from("suunto_tokens")
        .delete()
        .eq("user_id", context.user.id);

      if (error) return errorResponse("TOKEN_DELETE_FAILED", 500, error.message);

      return json({ connected: false });
    }

    const row = await getTokenRow(context.admin, context.user.id);

    if (!row) {
      return json({
        connected: false,
        username: null,
        expiresAt: null,
      });
    }

    const fresh = await ensureFreshToken(context.admin, row).catch(() => null);

    if (!fresh) {
      return json({
        connected: false,
        username: row.suunto_username,
        expiresAt: row.expires_at,
      });
    }

    return json({
      connected: true,
      username: fresh.suunto_username,
      expiresAt: fresh.expires_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return errorResponse("SUUNTO_OAUTH_FAILED", 500, message);
  }
});
