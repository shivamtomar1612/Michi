const rolePaths = {
  traveler: "/traveler",
  host: "/host",
  dmo: "/dmo",
  admin: "/admin",
} as const;

export type AppRole = keyof typeof rolePaths;

export function isAppRole(role: unknown): role is AppRole {
  return typeof role === "string" && Object.hasOwn(rolePaths, role);
}

export function homeForRole(role: AppRole) {
  return rolePaths[role];
}

export function safeLocalPath(value: string | null, fallback = "/traveler") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const parsed = new URL(value, "https://michi.invalid");
    if (parsed.origin !== "https://michi.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
export function hasSupabaseAuthCookie(cookies: Array<{ name: string }>): boolean {
  return cookies.some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/u.test(name));
}
