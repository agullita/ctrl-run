import {
  authenticate,
  ensureFreshToken,
  errorResponse,
  extractHeartRateSamples,
  findLatestWorkout,
  getTokenRow,
  handleOptions,
  json,
  mapWorkout,
  suuntoApi,
  workoutExtensionsPath,
  workoutKey,
  workoutListPath,
} from "../_shared/suunto.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  const context = await authenticate(req);
  if (!context) return errorResponse("UNAUTHORIZED", 401);

  const tokenRow = await getTokenRow(context.admin, context.user.id);
  if (!tokenRow) return errorResponse("SUUNTO_NOT_CONNECTED", 401);

  try {
    const token = await ensureFreshToken(context.admin, tokenRow);
    const listPayload = await suuntoApi<unknown>(workoutListPath(), token.access_token);
    const latest = findLatestWorkout(listPayload);

    if (!latest) {
      return errorResponse("SUUNTO_WORKOUT_NOT_FOUND", 404);
    }

    const key = workoutKey(latest);
    if (!key) {
      return errorResponse("SUUNTO_WORKOUT_KEY_MISSING", 422);
    }

    const detail = await suuntoApi<Record<string, unknown>>(
      workoutExtensionsPath(key),
      token.access_token,
    );

    const samples = extractHeartRateSamples(detail);

    if (samples.length < 2) {
      return errorResponse(
        "SUUNTO_HEARTRATE_STREAM_EMPTY",
        422,
        "La actividad no contiene HeartrateStreamExtension.",
      );
    }

    return json({
      activity: mapWorkout(detail, samples),
      samples,
      origin: "suunto",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return errorResponse("SUUNTO_SYNC_FAILED", 500, message);
  }
});
