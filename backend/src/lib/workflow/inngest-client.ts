import { Inngest } from "inngest";

/** Inngest SDK client — only imported by Inngest transport files, never by services. */
export const inngest = new Inngest({
  id: "biassemble",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

export function jobEventName(jobType: string): string {
  return `biassemble/${jobType}`;
}
