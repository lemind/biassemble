import { describe, it, expect } from "vitest";
import { clientIpFrom, clientIpWithSource } from "@/lib/http";

function requestWithXff(value: string | null): Request {
  const headers = new Headers();
  if (value !== null) headers.set("x-forwarded-for", value);
  return new Request("http://localhost/api/grounnel/extract", { headers });
}

describe("clientIpFrom", () => {
  it("returns the first IP from a multi-value x-forwarded-for header", () => {
    expect(clientIpFrom(requestWithXff("203.0.113.1, 10.0.0.1, 10.0.0.2"))).toBe("203.0.113.1");
  });

  it("trims whitespace around the first IP", () => {
    expect(clientIpFrom(requestWithXff("  203.0.113.1  , 10.0.0.1"))).toBe("203.0.113.1");
  });

  it("returns the IP unchanged for a single-value header", () => {
    expect(clientIpFrom(requestWithXff("203.0.113.1"))).toBe("203.0.113.1");
  });

  it("returns undefined when the header is missing", () => {
    expect(clientIpFrom(requestWithXff(null))).toBeUndefined();
  });

  it("returns undefined for an empty header value", () => {
    expect(clientIpFrom(requestWithXff(""))).toBeUndefined();
  });

  it("returns undefined for a malformed header of only commas/whitespace", () => {
    expect(clientIpFrom(requestWithXff(" , , "))).toBeUndefined();
  });
});

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/grounnel/extract", { headers: new Headers(headers) });
}

describe("clientIpFrom header precedence", () => {
  it("prefers x-forwarded-for over the edge-set headers", () => {
    const request = requestWithHeaders({
      "x-forwarded-for": "203.0.113.1, 10.0.0.1",
      "x-vercel-forwarded-for": "198.51.100.9",
      "x-real-ip": "198.51.100.9",
    });
    expect(clientIpFrom(request)).toBe("203.0.113.1");
    expect(clientIpWithSource(request).header).toBe("x-forwarded-for");
  });

  it("falls back to x-vercel-forwarded-for, then x-real-ip", () => {
    expect(clientIpWithSource(requestWithHeaders({
      "x-vercel-forwarded-for": "198.51.100.9",
      "x-real-ip": "192.0.2.5",
    }))).toEqual({ ip: "198.51.100.9", header: "x-vercel-forwarded-for" });
    expect(clientIpWithSource(requestWithHeaders({ "x-real-ip": "192.0.2.5" })))
      .toEqual({ ip: "192.0.2.5", header: "x-real-ip" });
  });

  it("skips an empty higher-priority header instead of returning undefined", () => {
    expect(clientIpFrom(requestWithHeaders({
      "x-forwarded-for": "  ",
      "x-real-ip": "192.0.2.5",
    }))).toBe("192.0.2.5");
  });

  it("reports no header when none are present", () => {
    expect(clientIpWithSource(requestWithHeaders({}))).toEqual({});
  });
});
