import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { Database } from "@/types/database";

const localWindows = new Map<string, { start: number; count: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

export async function allowGuestRequest(request: NextRequest, routeKey: "recommendations" | "itinerary_generation", maxRequests: number): Promise<boolean> {
  const ip = request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const key = process.env.RATE_LIMIT_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "michi-guest-rate-limit-local";
  const requesterHash = createHmac("sha256", key).update(ip).digest("hex");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const localKey = `${routeKey}:${requesterHash}`;
  if (serviceKey && url) {
    const limiter = createClient<Database>(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await limiter.rpc("consume_guest_request_limit", {
      p_requester_hash: requesterHash,
      p_route_key: routeKey,
      p_max_requests: maxRequests,
    });
    if (error) throw new Error("Guest recommendation limiter is unavailable.");
    return data;
  }

  // Local fallback for development; production deployments should configure a server key for shared limits.
  if (process.env.NODE_ENV === "production") throw new Error("Guest request limiter is not configured.");
  const now = Date.now();
  for (const [hash, window] of localWindows) if (now - window.start > WINDOW_MS * 2) localWindows.delete(hash);
  const window = localWindows.get(localKey);
  if (!window || now - window.start >= WINDOW_MS) {
    localWindows.set(localKey, { start: now, count: 1 });
    return true;
  }
  window.count += 1;
  return window.count <= maxRequests;
}

export const GUEST_RECOMMENDATION_LIMIT = MAX_REQUESTS;
