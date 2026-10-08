import { readFile } from "node:fs/promises";

const registry = await readFile(new URL("../../lib/data-sources/registry.ts", import.meta.url), "utf8");
const seed = await readFile(new URL("../../supabase/seed/real_tourism.sql", import.meta.url), "utf8");
const approvedHosts = new Set([...registry.matchAll(/baseUrl:\s*"https:\/\/([^"/]+)"/g)].map((match) => match[1].toLowerCase()));
const sourceUrls = [...seed.matchAll(/https:\/\/[^'"\s)]+/g)].map(([url]) => url.replace(/[.,;]+$/, ""));
const errors = [];

if (approvedHosts.size === 0) errors.push("The source registry contains no domains.");
for (const value of sourceUrls) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !approvedHosts.has(url.hostname.toLowerCase())) {
      errors.push(`URL is outside the HTTPS exact-host allowlist: ${value}`);
    }
  } catch {
    errors.push(`Invalid URL in reviewed seed: ${value}`);
  }
}
if (!seed.includes("on conflict (source_id, canonical_source_url) do nothing")) errors.push("Places and external listings must use idempotent canonical source identity.");
if (!seed.includes("michi_booking_enabled,\n accessibility_status") || !seed.includes("false,")) errors.push("External listings must remain disabled for MICHI booking.");

if (errors.length) {
  console.error(`Source validation failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(`Source registry valid: ${approvedHosts.size} approved domains; ${sourceUrls.length} reviewed URLs; exact-host HTTPS checks passed.`);
}
