/** Whether the endpoint must refuse requests instead of using a process-local limiter. */
export function requiresSharedRateLimit(environment: string | undefined, sharedKey: string | undefined): boolean {
  return environment === "production" && !sharedKey;
}
