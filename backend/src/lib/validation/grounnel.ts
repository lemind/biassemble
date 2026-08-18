import { z } from "zod";

// Own schema, not storySchema — Grounnel checks an arbitrary pasted article, not a personal
// reflection story; the two have no reason to share a length bar. biassemble-core's own
// ExtractRequestSchema (min 1) is the real business validation; this is a thin pre-check.
export const grounnelTextSchema = z.object({
  text: z.string().min(1, "Text is required"),
});

export type GrounnelTextInput = z.infer<typeof grounnelTextSchema>;
