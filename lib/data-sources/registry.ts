export interface SourceRegistration {
  name: string;
  baseUrl: string;
  sourceType: string;
  authorityLevel: 3 | 4 | 5;
  official: boolean;
  active: boolean;
  retrievalMethod: "manual_reviewed_page" | "link_only" | "not_yet_reviewed";
  robotsStatus: "checked_allow_root" | "not_checked_by_runtime" | "not_checked";
}

// Exact hostnames only: this is an ingestion allowlist, not permission to crawl.
export const sourceRegistry: readonly SourceRegistration[] = [
  { name: "Japan National Tourism Organization", baseUrl: "https://www.japan.travel", sourceType: "national_tourism_board", authorityLevel: 4, official: true, active: true, retrievalMethod: "manual_reviewed_page", robotsStatus: "checked_allow_root" },
  { name: "Japan Tourism Agency", baseUrl: "https://www.mlit.go.jp", sourceType: "government", authorityLevel: 5, official: true, active: true, retrievalMethod: "manual_reviewed_page", robotsStatus: "not_checked_by_runtime" },
  { name: "Agency for Cultural Affairs", baseUrl: "https://www.bunka.go.jp", sourceType: "government", authorityLevel: 5, official: true, active: true, retrievalMethod: "manual_reviewed_page", robotsStatus: "not_checked_by_runtime" },
  { name: "Kyoto Travel", baseUrl: "https://kyoto.travel", sourceType: "official_city_tourism", authorityLevel: 4, official: true, active: true, retrievalMethod: "manual_reviewed_page", robotsStatus: "not_checked_by_runtime" },
  { name: "Kyoto Travel Congestion Forecast", baseUrl: "https://global.kyoto.travel", sourceType: "official_city_tourism", authorityLevel: 4, official: true, active: true, retrievalMethod: "link_only", robotsStatus: "not_checked_by_runtime" },
  { name: "VISIT KANAZAWA", baseUrl: "https://visitkanazawa.jp", sourceType: "official_city_tourism", authorityLevel: 4, official: true, active: true, retrievalMethod: "manual_reviewed_page", robotsStatus: "not_checked_by_runtime" },
  { name: "Ishikawa Travel", baseUrl: "https://www.ishikawatravel.jp", sourceType: "official_prefectural_tourism", authorityLevel: 4, official: true, active: false, retrievalMethod: "not_yet_reviewed", robotsStatus: "not_checked" },
  { name: "HOT ISHIKAWA", baseUrl: "https://www.hot-ishikawa.jp", sourceType: "official_prefectural_tourism", authorityLevel: 4, official: true, active: false, retrievalMethod: "not_yet_reviewed", robotsStatus: "not_checked" },
  { name: "Ishikawa Prefectural Government", baseUrl: "https://www.pref.ishikawa.lg.jp", sourceType: "prefectural_government", authorityLevel: 5, official: true, active: false, retrievalMethod: "not_yet_reviewed", robotsStatus: "not_checked" },
  { name: "Hida Takayama Official Tourism Guide", baseUrl: "https://www.hidatakayama.or.jp", sourceType: "official_city_tourism", authorityLevel: 4, official: true, active: true, retrievalMethod: "manual_reviewed_page", robotsStatus: "not_checked_by_runtime" },
  { name: "Takayama City Official Information", baseUrl: "https://www.hida.jp", sourceType: "municipality", authorityLevel: 5, official: true, active: true, retrievalMethod: "manual_reviewed_page", robotsStatus: "not_checked_by_runtime" },
  { name: "Visit Gifu", baseUrl: "https://visitgifu.com", sourceType: "official_prefectural_tourism", authorityLevel: 4, official: true, active: false, retrievalMethod: "not_yet_reviewed", robotsStatus: "not_checked" },
  { name: "Kutani Ware Kutani Kosen Kiln", baseUrl: "https://kutanikosen.com", sourceType: "primary_operator", authorityLevel: 3, official: true, active: true, retrievalMethod: "manual_reviewed_page", robotsStatus: "not_checked_by_runtime" },
  { name: "Kanazawa Katani", baseUrl: "https://www.k-katani.com", sourceType: "primary_operator", authorityLevel: 3, official: true, active: true, retrievalMethod: "manual_reviewed_page", robotsStatus: "not_checked_by_runtime" },
] as const;

const registrationsByHost = new Map(sourceRegistry.map((source) => [new URL(source.baseUrl).hostname, source]));

export function isAllowedSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && registrationsByHost.has(url.hostname);
  } catch {
    return false;
  }
}

export function canonicalSourceUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
  }
  url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  url.searchParams.sort();
  return url.toString();
}
