import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseJsonFromAi } from "@/lib/ai/parsers";
import { AppException } from "@/lib/errors";

const schema = z.object({ foo: z.string() });

describe("parseJsonFromAi", () => {
  it("returns parsed data for valid JSON matching the schema", async () => {
    await expect(parseJsonFromAi('{"foo":"bar"}', schema)).resolves.toEqual({ foo: "bar" });
  });

  it("strips markdown code fences before parsing", async () => {
    await expect(parseJsonFromAi('```json\n{"foo":"bar"}\n```', schema)).resolves.toEqual({ foo: "bar" });
  });

  it("throws AppException (AI_PARSE_ERROR, 502) on invalid JSON — not a plain Error", async () => {
    await expect(parseJsonFromAi("not json", schema)).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe("AI_PARSE_ERROR");
      expect((error as AppException).statusCode).toBe(502);
      return true;
    });
  });

  it("throws AppException (AI_PARSE_ERROR, 502) on schema-mismatched JSON — not a plain Error", async () => {
    await expect(parseJsonFromAi('{"foo":123}', schema)).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe("AI_PARSE_ERROR");
      expect((error as AppException).statusCode).toBe(502);
      return true;
    });
  });
});
