import { z } from "zod";

export const storySchema = z.object({
  text: z
    .string()
    .min(50, "Story must be at least 50 characters")
    .max(3000, "Story must be at most 3000 characters"),
});

export type StoryInput = z.infer<typeof storySchema>;