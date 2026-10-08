import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const privileged = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (!url || !key) throw new Error("Hosted Supabase URL and API key are required.");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const tables = ["profiles", "destinations", "places", "external_experiences", "experiences", "experience_slots", "bookings", "destination_demo_signals", "destination_health_signals", "cultural_sources", "cultural_content", "analytics_events", "recommendation_logs", "community_feedback"];

const result = { project: new URL(url).hostname, queryRole: privileged ? "service_role" : "anon", tables: {}, auth: {} };
for (const table of tables) {
  const { count, error } = await client.from(table).select("*", { count: "exact", head: true });
  if (error) result.tables[table] = { count: "unknown", status: "inaccessible", httpStatus: 401 };
  else if (count === null) {
    const probe = await client.from(table).select("id").limit(1);
    result.tables[table] = probe.error?.code === "PGRST205"
      ? { count: "not applicable", status: "table absent" }
      : { count: "unknown", status: probe.error ? "inaccessible" : "unavailable" };
  } else result.tables[table] = { count };
}
if (privileged) {
  const { data: users, error: usersError } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
  result.auth = usersError ? { error: usersError.message } : { totalUsers: users.total };
} else result.auth = { error: "No privileged key available; Auth users cannot be audited through anon access." };
for (const [table, columns] of Object.entries({
  destinations: "verification_status,data_status,last_verified_at,next_verification_at",
  places: "verification_status,data_status,last_verified_at,next_verification_at",
  external_experiences: "verification_status,data_status,booking_mode,last_verified_at,next_verification_at",
  experiences: "is_verified,status,is_paused",
  destination_health_signals: "data_mode,verification_status,observed_at,expires_at",
})) {
  const { data, error } = await client.from(table).select(columns).limit(1000);
  if (!error && data) result.tables[table].distribution = data.reduce((out, row) => {
    for (const [key, value] of Object.entries(row)) {
      if (key.endsWith("_at")) continue;
      const label = `${key}:${value}`;
      out[label] = (out[label] ?? 0) + 1;
    }
    return out;
  }, {});
  if (!error && data) result.tables[table].freshness = {
    earliestVerified: data.map((row) => row.last_verified_at).filter(Boolean).sort()[0] ?? null,
    latestVerified: data.map((row) => row.last_verified_at).filter(Boolean).sort().at(-1) ?? null,
    stale: data.filter((row) => row.next_verification_at && Date.parse(row.next_verification_at) <= Date.now()).length,
  };
}
console.log(JSON.stringify(result, null, 2));
