import { createMockActivityPayload } from "./mockActivity";
import { SUUNTO_DEMO_MODE, fetchLatestSuuntoActivity } from "./suunto";
import type { ActivityPayload } from "./types";

const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

export async function fetchLatestActivityPayload(): Promise<ActivityPayload> {
  if (!SUUNTO_DEMO_MODE) {
    const suunto = await fetchLatestSuuntoActivity();
    if (suunto) {
      return {
        activity: suunto.activity,
        samples: suunto.samples,
        origin: "suunto",
      };
    }
  }

  await delay(900);
  return createMockActivityPayload();
}
