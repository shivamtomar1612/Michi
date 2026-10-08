import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "db", "query", "--linked", "--file", "supabase/seed/verify_real_tourism.sql"], {
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
  console.error("Catalogue verification could not run. Confirm the project is linked, authenticated, and the Phase 3 migration and seed have been applied.");
  process.exitCode = result.status ?? 1;
}
