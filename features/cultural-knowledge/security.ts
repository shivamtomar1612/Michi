import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import https from "node:https";

const MAX_BYTES = 1_000_000;
const TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;

export class SourceFetchError extends Error {
  constructor(message: string, readonly code: string, readonly status = 400) { super(message); }
}

function ipv4Number(address: string): number {
  return address.split(".").reduce((value, part) => ((value << 8) | Number(part)) >>> 0, 0);
}

function inV4Range(address: string, network: string, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4Number(address) & mask) === (ipv4Number(network) & mask);
}

export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const blocked: Array<[string, number]> = [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
      ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
      ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
      ["224.0.0.0", 4], ["240.0.0.0", 4],
    ];
    return !blocked.some(([network, prefix]) => inV4Range(address, network, prefix));
  }
  if (version === 6) {
    const value = address.toLowerCase();
    if (value === "::" || value === "::1" || value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("ff")) return false;
    const mapped = value.match(/^::ffff:(?:(\d+\.\d+\.\d+\.\d+)|([\da-f]{1,4}):([\da-f]{1,4}))$/);
    if (mapped) {
      const dotted = mapped[1] ?? [parseInt(mapped[2]!, 16) >> 8, parseInt(mapped[2]!, 16) & 255, parseInt(mapped[3]!, 16) >> 8, parseInt(mapped[3]!, 16) & 255].join(".");
      return isPublicAddress(dotted);
    }
    // Only globally routable 2000::/3 unicast space is eligible. Reject transition,
    // documentation and special-use ranges rather than trying to enumerate all of them.
    const first = parseInt(value.split(":")[0] || "0", 16);
    const second = parseInt(value.split(":")[1] || "0", 16);
    if (first < 0x2000 || first > 0x3fff || value.startsWith("2001:db8:") || value.startsWith("2002:") || first === 0x2001 && second < 0x0200) return false;
    return true;
  }
  return false;
}

export function validateApprovedUrl(rawUrl: string, approvedHosts: string[]): URL {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new SourceFetchError("Enter a valid source URL.", "invalid_url"); }
  if (url.protocol !== "https:") throw new SourceFetchError("Only HTTPS source URLs can be fetched.", "https_required");
  if (url.username || url.password || url.port && url.port !== "443") throw new SourceFetchError("Credentials and nonstandard ports are not allowed.", "unsafe_url");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const approved = approvedHosts.map((item) => item.toLowerCase().replace(/^\*\./, "").replace(/\.$/, ""));
  if (!approved.some((domain) => host === domain)) throw new SourceFetchError("The URL host is not approved for this source.", "host_not_approved", 403);
  if (isIP(host) && !isPublicAddress(host)) throw new SourceFetchError("Private or reserved network addresses are blocked.", "private_address", 403);
  url.hash = "";
  return url;
}

async function resolvePublic(host: string): Promise<string> {
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw new SourceFetchError("Private or reserved network addresses are blocked.", "private_address", 403);
    return host;
  }
  const addresses = await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => !isPublicAddress(entry.address))) throw new SourceFetchError("Source host resolves to a private or reserved address.", "unsafe_dns", 403);
  return addresses.find((entry) => entry.family === 4)?.address ?? addresses[0]!.address;
}

function requestPinned(url: URL, address: string): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  return new Promise((resolve, reject) => {
    const request = https.request({
      protocol: "https:", hostname: url.hostname, servername: url.hostname, port: 443,
      path: url.pathname + url.search, method: "GET", timeout: TIMEOUT_MS,
      headers: { "user-agent": "MICHI-CulturalResearch/1.0 (+https://michi.travel/source-policy)", accept: "text/html,application/xhtml+xml,text/plain" },
      lookup: (_hostname, _options, callback) => callback(null, address, isIP(address)),
    }, (response) => {
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BYTES) { request.destroy(new SourceFetchError("Source response exceeds the 1 MB limit.", "response_too_large", 413)); return; }
        chunks.push(chunk);
      });
      response.on("end", () => resolve({
        status: response.statusCode ?? 0,
        headers: response.headers as Record<string, string | string[] | undefined>,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
      response.on("error", reject);
    });
    request.on("timeout", () => request.destroy(new SourceFetchError("Source request timed out.", "timeout", 504)));
    request.on("error", reject);
    request.end();
  });
}

async function fetchFollowingRedirects(initial: URL, approvedHosts: string[]): Promise<{ url: URL; status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  let current = initial;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    current = validateApprovedUrl(current.href, approvedHosts);
    const ip = await resolvePublic(current.hostname);
    const response = await requestPinned(current, ip);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.location;
      if (typeof location !== "string" || redirect === MAX_REDIRECTS) throw new SourceFetchError("Source redirect could not be safely followed.", "redirect_limit", 400);
      current = new URL(location, current);
      continue;
    }
    return { url: current, ...response };
  }
  throw new SourceFetchError("Source redirect limit reached.", "redirect_limit");
}

export function robotsAllows(text: string, path: string): boolean {
  let candidate: string;
  try { candidate = decodeURIComponent(path); } catch { return false; }
  const groups: Array<{ agents: string[]; rules: Array<{ value: string; allow: boolean }> }> = [];
  let group: { agents: string[]; rules: Array<{ value: string; allow: boolean }> } = { agents: [], rules: [] };
  let sawRule = false;
  for (const line of text.split(/\r?\n/)) {
    const clean = line.split("#")[0]?.trim() ?? "";
    if (!clean) { if (group.agents.length) groups.push(group); group = { agents: [], rules: [] }; sawRule = false; continue; }
    const colon = clean.indexOf(":");
    if (colon < 0) continue;
    const key = clean.slice(0, colon).trim().toLowerCase();
    const value = clean.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (sawRule) { groups.push(group); group = { agents: [], rules: [] }; sawRule = false; }
      group.agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && group.agents.length) { group.rules.push({ value, allow: key === "allow" }); sawRule = true; }
  }
  if (group.agents.length) groups.push(group);
  const specific = groups.filter((item) => item.agents.some((agent) => agent !== "*" && "michi-culturalresearch".includes(agent)));
  const selected = specific.length ? specific : groups.filter((item) => item.agents.includes("*"));
  const rules = selected.flatMap((item) => item.rules).filter((rule) => {
    const terminal = rule.value.endsWith("$");
    let source = terminal ? rule.value.slice(0, -1) : rule.value;
    try { source = decodeURIComponent(source); } catch { return false; }
    const escaped = source.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp("^" + escaped + (terminal ? "$" : "")).test(candidate);
  });
  const matched = rules.sort((a, b) => b.value.replace(/\*/g, "").length - a.value.replace(/\*/g, "").length || Number(b.allow) - Number(a.allow))[0];
  return matched?.allow ?? true;
}

export interface FetchedSource { url: string; contentType: string; body: string; retrievedAt: string }

export async function fetchApprovedSource(rawUrl: string, approvedHosts: string[]): Promise<FetchedSource> {
  let current = validateApprovedUrl(rawUrl, approvedHosts);
  let page: { url: URL; status: number; headers: Record<string, string | string[] | undefined>; body: string } | null = null;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const robots = await fetchFollowingRedirects(new URL("/robots.txt", current.origin), approvedHosts);
    if (robots.url.hostname !== current.hostname) throw new SourceFetchError("robots.txt redirected outside the selected source host.", "robots_redirect", 403);
    if (robots.status === 200 && !String(robots.headers["content-type"] ?? "").toLowerCase().startsWith("text/plain")) throw new SourceFetchError("robots.txt did not return plain text.", "invalid_robots_type", 403);
    if (robots.status !== 404 && (robots.status !== 200 || !robotsAllows(robots.body, current.pathname + current.search))) {
      throw new SourceFetchError("robots.txt blocks this path or could not be verified.", "robots_disallowed", 403);
    }
    current = validateApprovedUrl(current.href, approvedHosts);
    const ip = await resolvePublic(current.hostname);
    const response = await requestPinned(current, ip);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.location;
      if (typeof location !== "string" || redirect === MAX_REDIRECTS) throw new SourceFetchError("Source redirect could not be safely followed.", "redirect_limit", 400);
      current = new URL(location, current);
      continue;
    }
    page = { url: current, ...response };
    break;
  }
  if (!page) throw new SourceFetchError("Source redirect limit reached.", "redirect_limit");
  if (page.status < 200 || page.status >= 300) throw new SourceFetchError("The source returned HTTP " + page.status + ".", "source_http_error", 502);
  const contentType = String(page.headers["content-type"] ?? "").split(";")[0]!.trim().toLowerCase();
  if (!new Set(["text/html", "application/xhtml+xml", "text/plain"]).has(contentType)) throw new SourceFetchError("Only HTML and plain text sources can be previewed.", "unsupported_content_type", 415);
  return { url: page.url.href, contentType, body: page.body, retrievedAt: new Date().toISOString() };
}
