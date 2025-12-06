import { describe, it, expect } from "bun:test";
import { proxySchema, speedTestSchema } from "./schema";

// Basic validation to ensure schemas accept valid shapes and reject invalid ones

describe("proxySchema", () => {
  it("accepts a valid proxy object", () => {
    const result = proxySchema.safeParse({
      id: "proxy-1",
      ip: "192.168.0.1",
      port: 8080,
      type: "http",
      status: "ONLINE",
      latency: 120,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid port and IP", () => {
    const result = proxySchema.safeParse({
      id: "bad-proxy",
      ip: "not-an-ip",
      port: 70000,
      type: "http",
      status: "ONLINE",
      latency: null,
    });

    expect(result.success).toBe(false);
  });
});

describe("speedTestSchema", () => {
  it("accepts a valid speed test result", () => {
    const result = speedTestSchema.safeParse({
      status: "COMPLETED",
      downloadSpeed: 12.5,
      progress: 1,
      fileSize: 100,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid status and negative values", () => {
    const result = speedTestSchema.safeParse({
      status: "BAD", // invalid status
      downloadSpeed: -5,
      progress: -0.1,
      fileSize: -10,
    });

    expect(result.success).toBe(false);
  });
});
