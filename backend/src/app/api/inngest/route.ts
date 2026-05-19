import { serve } from "inngest/next";
import { inngest } from "@/lib/workflow/inngest-client";
import { inngestFunctions } from "@/lib/workflow/inngest-functions";

/** Inngest webhook — thin transport layer; job logic lives in lib/jobs/. */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
