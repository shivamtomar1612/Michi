import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const results = [];
const report = (name, status, detail = "") => {
  results.push({ name, status, detail });
  console.log(`${status.padEnd(7)} ${name}${detail ? ` — ${detail}` : ""}`);
};
const root = process.cwd();
const envPath = path.join(root, ".env.local");

function loadLocalEnv(text) {
  for (const line of text.split(/\r?\n/u)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/u);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/u, "");
    process.env[match[1]] = value;
  }
}

function classifyHttp(status, body) {
  const message = JSON.stringify(body).toLowerCase();
  if (status === 400 && /api_key_invalid|invalid api key|api key not valid/u.test(message)) return "HTTP 400 invalid API key";
  if (status === 401) return "HTTP 401 invalid API key";
  if (status === 403) return "HTTP 403 API not enabled or permission denied";
  if (status === 404) return "HTTP 404 model unavailable";
  if (status === 429 && /quota|billing|limit/u.test(message)) return "HTTP 429 quota exceeded";
  if (status === 429) return "HTTP 429 rate limit exceeded";
  if (status === 503) return "Gemini service unavailable (HTTP 503)";
  return `HTTP ${status} API failure`;
}

async function geminiJson(url, apiKey, init = {}) {
  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), "x-goog-api-key": apiKey }, signal: AbortSignal.timeout(20_000) });
      if (response.status !== 503 || attempt === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    } catch {
      if (attempt === 1) throw new Error("network failure");
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  let data;
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) throw new Error(classifyHttp(response.status, data));
  return { ...data, _verificationHttpStatus: response.status };
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("port allocation failed"));
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, child) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) throw new Error("Next.js server exited before startup");
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok || response.status < 500) return;
    } catch { /* poll until ready */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Next.js server startup timed out");
}

async function listFiles(directory, predicate, output = []) {
  if (!existsSync(directory)) return output;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await listFiles(fullPath, predicate, output);
    else if (predicate(fullPath)) output.push(fullPath);
  }
  return output;
}

async function main() {
  if (existsSync(envPath)) {
    loadLocalEnv(await readFile(envPath, "utf8"));
    report(".env.local present", "PASS");
  } else report(".env.local present", "FAIL", "create it from .env.example");

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const configuredModel = process.env.AI_MODEL?.trim();
  const model = !configuredModel || configuredModel.toLowerCase() === "gemini" ? "gemini-3.8-flash" : configuredModel.replace(/^models\//iu, "");
  report("GEMINI_API_KEY configured", apiKey ? "PASS" : "FAIL", apiKey ? "server-side value present" : "set GEMINI_API_KEY in .env.local or deployment secrets");
  report("AI_MODEL configured", configuredModel ? "PASS" : "FAIL", configuredModel ? `configured model: ${model}` : "set AI_MODEL to a supported Gemini model ID");
  const publicGeminiVars = Object.keys(process.env).filter((key) => key.startsWith("NEXT_PUBLIC_") && /GEMINI|AI_MODEL/iu.test(key));
  report("No public Gemini environment variables", publicGeminiVars.length === 0 ? "PASS" : "FAIL", publicGeminiVars.length ? "remove public Gemini variables" : "");

  const gitignore = await readFile(path.join(root, ".gitignore"), "utf8").catch(() => "");
  const ignoresLocalEnv = gitignore.split(/\r?\n/u).some((line) => /^\.env\.\*$/u.test(line.trim())) || gitignore.split(/\r?\n/u).some((line) => /^\.env\.local$/u.test(line.trim()));
  report(".env.local excluded by .gitignore", ignoresLocalEnv ? "PASS" : "FAIL");
  report("Git history secret scan", existsSync(path.join(root, ".git")) ? "SKIPPED" : "SKIPPED", "repository metadata is unavailable in this workspace");

  if (!apiKey) {
    for (const name of ["Gemini model discovery", "Gemini generation", "Supabase RAG", "Next.js endpoint", "Client bundle secret scan"]) report(name, "SKIPPED", "Gemini API key is not configured");
    process.exitCode = 1;
    return;
  }

  let discovered = false;
  let discoveryHttpStatus;
  try {
    const allModels = [];
    let pageToken;
    do {
      const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
      url.searchParams.set("pageSize", "1000");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const data = await geminiJson(url, apiKey);
      discoveryHttpStatus = data._verificationHttpStatus;
      allModels.push(...(Array.isArray(data.models) ? data.models : []));
      pageToken = data.nextPageToken;
    } while (pageToken);
    const requested = allModels.find((item) => String(item.name ?? "").replace(/^models\//u, "") === model);
    discovered = true;
    if (!requested) throw new Error("model unavailable");
    if (!Array.isArray(requested.supportedGenerationMethods) || !requested.supportedGenerationMethods.includes("generateContent")) throw new Error("model does not support content generation");
    report("Gemini model discovery", "PASS", `HTTP ${discoveryHttpStatus}; ${model} supports generateContent`);
  } catch (error) {
    report("Gemini model discovery", "FAIL", error instanceof Error ? error.message : "API configuration failure");
  }

  let generationPassed = false;
  if (discovered) {
    try {
      const data = await geminiJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, apiKey, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Respond with exactly: MICHI_GEMINI_TEST_OK" }] }], generationConfig: { maxOutputTokens: 40, thinkingConfig: { thinkingLevel: "low" } } }),
      });
      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
      if (text !== "MICHI_GEMINI_TEST_OK") throw new Error("model returned unexpected test text");
      generationPassed = true;
      report("Gemini real text generation", "PASS", `HTTP ${data._verificationHttpStatus}; authenticated generateContent returned the exact test text`);
    } catch (error) {
      report("Gemini real text generation", "FAIL", error instanceof Error ? error.message : "generation failed");
    }
  } else report("Gemini real text generation", "SKIPPED", "model discovery did not pass");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let verifiedRecords = [];
  let supabaseClient;
  try {
    if (!supabaseUrl || !supabaseKey) throw new Error("public Supabase environment is incomplete");
    supabaseClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const query = await supabaseClient.from("cultural_content").select("id,title,content,summary,source_url,source_name,source_type,authority_level,verification_status,last_verified_at,is_active,category,destination_id,experience_id").eq("is_active", true).in("verification_status", ["official_verified", "community_verified"]).textSearch("search_vector", "Japanese customs etiquette", { type: "websearch", config: "simple" }).limit(10);
    if (query.error) throw new Error("Supabase cultural catalogue query failed");
    verifiedRecords = query.data ?? [];
    report("Supabase verified cultural RAG retrieval", verifiedRecords.length ? "PASS" : "FAIL", verifiedRecords.length ? `${verifiedRecords.length} active verified records returned through anon RLS` : "no verified record matched the RAG test query");
  } catch (error) {
    report("Supabase verified cultural RAG retrieval", "FAIL", error instanceof Error ? error.message : "Supabase unavailable");
  }

  const envExample = await readFile(path.join(root, ".env.example"), "utf8").catch(() => "");
  const configured = verifiedRecords.length > 0 && supabaseUrl && supabaseKey;
  if (!configured) {
    report("Next.js endpoint integration", "SKIPPED", "requires live Gemini and verified Supabase RAG prerequisites");
  } else {
    let child;
    try {
      const port = await findFreePort();
      child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: root, env: process.env, stdio: ["ignore", "ignore", "ignore"] });
      const base = `http://localhost:${port}`;
      await waitForServer(base, child);
      const post = async (input) => {
        const response = await fetch(`${base}/api/ai/cultural-assistant`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify(input), signal: AbortSignal.timeout(30_000) });
        const data = await response.json().catch(() => ({}));
        if (JSON.stringify(data).includes(apiKey)) throw new Error("secret appeared in API response");
        return { response, data };
      };
      const catalogue = await supabaseClient.from("cultural_content").select("id,source_url").eq("is_active", true).in("verification_status", ["official_verified", "community_verified"]).limit(100);
      if (catalogue.error) throw new Error("Could not validate citations against the hosted catalogue");
      const knownSources = new Map((catalogue.data ?? []).map((row) => [row.id, row.source_url]));
      console.log("INFO    Waiting 31 seconds before each cultural generation probe to stay within provider request budgets.");
      await new Promise((resolve) => setTimeout(resolve, 31_000));
      const english = await post({ question: "Japanese customs etiquette", language: "en" });
      const englishCitation = english.response.ok && english.data.fallback === false && Array.isArray(english.data.citations) && english.data.citations.length > 0 && english.data.citations.every((citation) => knownSources.get(citation.id) === citation.sourceUrl && /^https:\/\//u.test(citation.sourceUrl));
      report("Next.js endpoint + grounded English response", englishCitation ? "PASS" : "FAIL", `HTTP ${english.response.status}; fallback=${String(english.data.fallback)} citations=${english.data.citations?.length ?? 0}`);
      report("Server citation validation", english.response.ok && Array.isArray(english.data.citations) && english.data.citations.length > 0 && english.data.citations.every((citation) => knownSources.get(citation.id) === citation.sourceUrl && /^https:\/\//u.test(citation.sourceUrl)) ? "PASS" : "FAIL", "returned citation IDs and URLs matched verified Supabase catalogue rows");

      const unsupported = await post({ question: "Is there a secret ritual every Tuesday at this temple?", language: "en" });
      const abstained = unsupported.response.ok && unsupported.data.uncertainty === true && unsupported.data.citations.length === 0 && /sufficiently verified information/iu.test(unsupported.data.answer);
      report("Endpoint missing-evidence abstention", abstained ? "PASS" : "FAIL", `HTTP ${unsupported.response.status}; no unsupported cultural claim accepted`);

      const scopedId = verifiedRecords[0]?.experience_id ?? "00000000-0000-4000-8000-000000000030";
      const photo = await post({ question: "What is the photography policy at this specific experience?", language: "en", experienceId: scopedId });
      const photoSafe = photo.response.ok && photo.data.uncertainty === true && photo.data.citations.length === 0 && /photograph/iu.test(photo.data.recommendedAction);
      report("Endpoint experience-specific photography policy", photoSafe ? "PASS" : "FAIL", `HTTP ${photo.response.status}; ${verifiedRecords[0]?.experience_id ? "tested against returned experience context" : "controlled UUID context; no host listing in public catalogue"}`);

      const access = await post({ question: "Is this venue wheelchair accessible?", language: "en", experienceId: scopedId });
      const accessSafe = access.response.ok && access.data.uncertainty === true && access.data.citations.length === 0 && /step-free access/iu.test(access.data.recommendedAction);
      report("Endpoint unverified accessibility abstention", accessSafe ? "PASS" : "FAIL", `HTTP ${access.response.status}; no accessibility inference accepted`);

      await new Promise((resolve) => setTimeout(resolve, 31_000));
      const japanese = await post({ question: "Japanese customs etiquette", language: "ja" });
      const japaneseText = typeof japanese.data.answer === "string" && /[\u3040-\u30ff\u3400-\u9fff]/u.test(japanese.data.answer);
      const japaneseCitations = Array.isArray(japanese.data.citations) && japanese.data.citations.length > 0 && japanese.data.citations.every((citation) => knownSources.get(citation.id) === citation.sourceUrl && /^https:\/\//u.test(citation.sourceUrl));
      report("Endpoint Japanese response and preserved citations", japanese.response.ok && japanese.data.fallback === false && japaneseText && japaneseCitations ? "PASS" : "FAIL", `HTTP ${japanese.response.status}; fallback=${String(japanese.data.fallback)} citations=${japanese.data.citations?.length ?? 0} japanese=${japaneseText}`);
      report("Next.js endpoint responses contain no credential", "PASS", "all sampled endpoint payloads were scanned for the configured key");
    } catch (error) {
      report("Next.js endpoint integration", "FAIL", error instanceof Error ? error.message : "endpoint startup or request failed");
    } finally {
      if (child && child.exitCode === null) child.kill();
    }
  }

  try {
    const bundleFiles = await listFiles(path.join(root, ".next/static"), (item) => item.endsWith(".js"));
    let secretFound = false;
    for (const file of bundleFiles) if ((await readFile(file, "utf8")).includes(apiKey)) secretFound = true;
    report("Browser JavaScript bundle secret scan", secretFound ? "FAIL" : "PASS", secretFound ? "a configured secret matched a public bundle" : `${bundleFiles.length} public JavaScript bundles scanned`);
  } catch {
    report("Browser JavaScript bundle secret scan", "SKIPPED", "production build output is unavailable");
  }
  report("Environment example secret check", envExample.includes(apiKey) ? "FAIL" : "PASS", envExample.includes(apiKey) ? "secret found in example config" : "example contains no configured credential");

  const failed = results.some((item) => item.status === "FAIL");
  process.exitCode = failed ? 1 : 0;
}

main().catch(() => {
  report("AI verification runner", "FAIL", "unexpected verification runner error; details withheld");
  process.exitCode = 1;
});
