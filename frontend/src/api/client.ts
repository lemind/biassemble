import axios from "axios";
import type {
  ExtractGrounnelResponse,
  GrounnelStatusOutput,
  SharedAssessment,
} from "../types/grounnel";

// Relative in every environment: vercel.json proxies /api/* in prod, vite.config.ts in dev.
// That rewrite MUST stay above the SPA catch-all or /api/* returns index.html at 200 (T016).
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

export async function submitGrounnelText(text: string): Promise<ExtractGrounnelResponse> {
  const response = await apiClient.post<ExtractGrounnelResponse>("/api/grounnel/extract", { text });
  return response.data;
}

export async function getGrounnelStatus(id: string): Promise<GrounnelStatusOutput> {
  const response = await apiClient.get<GrounnelStatusOutput>(`/api/grounnel/status/${id}`);
  return response.data;
}

export async function getSharedAssessment(token: string): Promise<SharedAssessment> {
  const response = await apiClient.get<SharedAssessment>(
    `/api/grounnel/assessment/${encodeURIComponent(token)}`,
  );
  return response.data;
}

export default apiClient;