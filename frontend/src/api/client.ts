import axios from "axios";

// Relative by default, in every environment: vercel.json proxies /api/* to the backend in
// production and vite.config.ts proxies it in dev, so the browser is always same-origin.
//
// vercel.json's /api rewrite MUST stay above its SPA catch-all, or /api/* is answered with
// index.html at 200 and axios parses HTML as a response (the T016 failure). That file cannot carry
// the warning itself — Vercel's schema sets additionalProperties:false on a rewrite entry, so a
// "comment" key fails the build.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 120_000,
});

export async function submitStory(text: string) {
  const response = await apiClient.post("/api/story", { text });
  return response.data;
}

export async function submitAnswers(
  sessionId: string,
  answers: string[]
) {
  const response = await apiClient.post("/api/answers", {
    sessionId,
    answers,
  });
  return response.data;
}

export async function getResult(sessionId: string) {
  const response = await apiClient.get(`/api/result/${sessionId}`);
  return response.data;
}

export async function getSession(sessionId: string) {
  const response = await apiClient.get(`/api/session/${sessionId}`);
  return response.data;
}

export async function submitGrounnelText(text: string) {
  const response = await apiClient.post("/api/grounnel/extract", { text });
  return response.data;
}

export async function getGrounnelStatus(id: string) {
  const response = await apiClient.get(`/api/grounnel/status/${id}`);
  return response.data;
}

export async function getSharedAssessment(token: string) {
  const response = await apiClient.get(
    `/api/grounnel/assessment/${encodeURIComponent(token)}`,
  );
  return response.data;
}

export default apiClient;