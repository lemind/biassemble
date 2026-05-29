import { NextResponse } from "next/server";
import { getCoreConfig } from "@/lib/ai/core-client";

/**
 * GET /api/contracts
 *
 * Returns the reflection contract schemas from the AI Core service.
 * Cached in-memory for the lifetime of the server instance.
 */
let cachedContracts: unknown | null = null;
let cachePromise: Promise<unknown> | null = null;

async function fetchContractsFromCore(): Promise<unknown> {
  const { baseUrl, apiKey } = getCoreConfig();
  const res = await fetch(`${baseUrl}/v1/contracts`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    // Short timeout — contracts are a lightweight endpoint
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch contracts: ${res.status}`);
  }

  return res.json();
}

export async function GET() {
  try {
    // Deduplicate concurrent requests
    if (!cachedContracts) {
      if (!cachePromise) {
        cachePromise = fetchContractsFromCore().then((data) => {
          cachedContracts = data;
          cachePromise = null;
          return data;
        }).catch((err) => {
          cachePromise = null;
          throw err;
        });
      }
      return NextResponse.json(await cachePromise, { status: 200 });
    }

    return NextResponse.json(cachedContracts, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch contracts";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}