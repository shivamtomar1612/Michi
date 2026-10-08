import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "db", "query", "--linked", "--file", "supabase/seed/real_tourism.sql"], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "true", SUPABASE_HOME: `${process.cwd()}/supabase/.temp` },
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) {
  console.error(`Could not start Supabase CLI: ${result.error.message}`);
  process.exitCode = 1;
} else if (result.status !== 0) {
  console.error("The reviewed catalogue snapshot was not imported. Confirm the schema migration is applied and the Supabase project is linked and authenticated.");
  process.exitCode = result.status ?? 1;
} else {
  console.log("Reviewed snapshot import completed. Conflicting existing records were preserved for manual review.");
}
