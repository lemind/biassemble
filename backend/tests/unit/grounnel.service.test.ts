import { describe, it, expect } from "vitest";
import { handleCreateGrounnelExtract } from "@/services/grounnel.service";
import { AppException } from "@/lib/errors";

describe("handleCreateGrounnelExtract validation", () => {
  it("throws AppException (VALIDATION_ERROR, 400) for empty text — not a plain Error", async () => {
    // Fails grounnelTextSchema before any DB/AI call, so no live server or DB needed here.
    await expect(handleCreateGrounnelExtract("")).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe("VALIDATION_ERROR");
      expect((error as AppException).statusCode).toBe(400);
      return true;
    });
  });
});
