import { describe, it, expect } from "vitest";
import { clientIpFrom } from "@/lib/http";

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
