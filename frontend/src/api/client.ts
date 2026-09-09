import axios from "axios";

// Relative by default, in every environment: vercel.json proxies /api/* to the backend in
// production and vite.config.ts proxies it in dev, so the browser is always same-origin. An
// absolute URL here means a cross-origin call to a backend that sends no CORS headers at all.
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