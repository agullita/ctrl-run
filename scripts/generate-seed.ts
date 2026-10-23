import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createMockActivityPayload } from "../src/lib/mockActivity";

function sqlText(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function formatArray(values: number[], cast: string): string {
  const lines: string[] = [];

  for (let index = 0; index < values.length; index += 32) {
    lines.push(`    ${values.slice(index, index + 32).join(", ")}`);
  }

  return `array[\n${lines.join(",\n")}\n  ]::${cast}`;
}

async function main() {
  const payload = createMockActivityPayload();
  const { activity } = payload;
  const timeStream = payload.streams.find((stream) => stream.type === "time");
  const heartrateStream = payload.streams.find((stream) => stream.type === "heartrate");

  if (!timeStream || !heartrateStream) {
    throw new Error("Mock streams are incomplete");
  }

  const sql = `insert into public.activities (
  id, name, sport_type, started_at, elapsed_time, distance,
  average_heartrate, max_heartrate, elevation_gain, device_name, is_demo
) values (
  ${sqlText(activity.id)},
  ${sqlText(activity.name)},
  ${sqlText(activity.sportType)},
  ${sqlText(activity.startedAt)},
  ${activity.elapsedTime},
  ${activity.distance},
  ${activity.averageHeartrate},
  ${activity.maxHeartrate},
  ${activity.elevationGain},
  ${sqlText(activity.deviceName)},
  true
)
on conflict (id) do update set
  name = excluded.name,
  sport_type = excluded.sport_type,
  started_at = excluded.started_at,
  elapsed_time = excluded.elapsed_time,
  distance = excluded.distance,
  average_heartrate = excluded.average_heartrate,
  max_heartrate = excluded.max_heartrate,
  elevation_gain = excluded.elevation_gain,
  device_name = excluded.device_name,
  is_demo = excluded.is_demo;

insert into public.activity_streams (activity_id, time_seconds, heartrate)
values (
  ${sqlText(activity.id)},
  ${formatArray(timeStream.data, "integer[]")},
  ${formatArray(heartrateStream.data, "smallint[]")}
)
on conflict (activity_id) do update set
  time_seconds = excluded.time_seconds,
  heartrate = excluded.heartrate;
`;

  const outputDirectory = join(process.cwd(), "supabase");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, "seed.sql"), sql, "utf8");

  console.log(`supabase/seed.sql generated: ${heartrateStream.data.length} heart rate samples`);
}

void main();
