// Shared schema types for ProxySpeedTester
// This file can be extended for any shared data types between client and server

import { z } from "zod";

// Proxy node schema
export const proxySchema = z.object({
  id: z.string(),
  ip: z.string().ip(),
  port: z.number().min(1).max(65535),
  type: z.enum(["socks5", "socks4", "http", "https", "unknown"]),
  status: z.enum(["PENDING", "ONLINE", "TIMEOUT", "ERROR"]),
  latency: z.number().nullable(),
});

export type Proxy = z.infer<typeof proxySchema>;

// Speed test result schema
export const speedTestSchema = z.object({
  status: z.enum(["IDLE", "TESTING", "COMPLETED", "FAILED"]),
  downloadSpeed: z.number(), // MB/s
  progress: z.number(),
  fileSize: z.number(), // MB
});

export type SpeedTest = z.infer<typeof speedTestSchema>;
