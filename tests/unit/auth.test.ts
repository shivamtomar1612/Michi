import { describe, expect, it } from "vitest";
import { emailSchema, signupSchema } from "@/features/auth/schemas";
import { hasSupabaseAuthCookie, homeForRole, isAppRole, safeLocalPath } from "@/lib/auth/redirects";

describe("auth input validation", () => {
  it("accepts valid sign-up input and trims the display name", () => {
    expect(signupSchema.parse({ name: "  Mika Tanaka ", email: "mika@example.jp", password: "long-enough" }).name).toBe("Mika Tanaka");
  });

  it("rejects invalid email and short password values", () => {
    expect(emailSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(signupSchema.safeParse({ name: "Mika", email: "mika@example.jp", password: "short" }).success).toBe(false);
  });
});

describe("role and redirect boundaries", () => {
  it("recognizes only supported roles and maps each role to its workspace", () => {
    expect(isAppRole("host")).toBe(true);
    expect(isAppRole("superuser")).toBe(false);
    expect(homeForRole("dmo")).toBe("/dmo");
  });

  it("allows safe local next paths and rejects external or protocol-relative URLs", () => {
    expect(safeLocalPath("/host?tab=slots")).toBe("/host?tab=slots");
    expect(safeLocalPath("https://outside.example/path")).toBe("/traveler");
    expect(safeLocalPath("//outside.example/path")).toBe("/traveler");
  });

  it("recognizes Supabase session cookies, including chunked cookies", () => {
    expect(hasSupabaseAuthCookie([])).toBe(false);
    expect(hasSupabaseAuthCookie([{ name: "sb-project-auth-token.0" }])).toBe(true);
    expect(hasSupabaseAuthCookie([{ name: "theme" }])).toBe(false);
  });
});
