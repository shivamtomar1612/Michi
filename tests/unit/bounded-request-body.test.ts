import { describe, expect, it, vi } from "vitest";
import { readBoundedRequestBody } from "@/server/security/request-body";

function streamingRequest(body: ReadableStream<Uint8Array>, headers?: HeadersInit) {
  return new Request("https://michi.test/api", {
    method: "POST",
    headers,
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

describe("readBoundedRequestBody", () => {
  it("returns the body for requests within the byte limit", async () => {
    const request = new Request("https://michi.test/api", { method: "POST", body: "{\"ok\":true}" });

    await expect(readBoundedRequestBody(request, 32)).resolves.toEqual({ ok: true, body: "{\"ok\":true}" });
  });

  it("rejects an oversized declared body before reading it", async () => {
    const cancel = vi.fn();
    const request = streamingRequest(new ReadableStream<Uint8Array>({ cancel }), { "content-length": "1024" });

    await expect(readBoundedRequestBody(request, 64)).resolves.toEqual({ ok: false, status: 413 });
  });

  it("cancels the stream when a chunk exceeds the limit without content-length", async () => {
    const cancel = vi.fn();
    const request = streamingRequest(new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("x".repeat(40)));
        },
        cancel,
      }));

    await expect(readBoundedRequestBody(request, 16)).resolves.toEqual({ ok: false, status: 413 });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("returns a client error for an unreadable stream", async () => {
    const request = streamingRequest(new ReadableStream<Uint8Array>({
        start(controller) {
          controller.error(new Error("stream failure"));
        },
      }));

    await expect(readBoundedRequestBody(request, 16)).resolves.toEqual({ ok: false, status: 400 });
  });
});
