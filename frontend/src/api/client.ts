import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10_000,
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

export default apiClient;