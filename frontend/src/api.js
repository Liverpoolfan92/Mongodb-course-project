// Всички заявки са към /api (относителен път)
// Vite ги проксира към http://backend:5000 (Docker service name)
const BASE = "/api";

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getUsers:       () => req("/users"),
  getQuestions:   (sort = "votes", tag = "") =>
    req(`/questions?sort=${sort}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`),
  getQuestion:    (id) => req(`/questions/${id}`),
  createQuestion: (data) => req("/questions", { method: "POST", body: JSON.stringify(data) }),
  voteQuestion:   (id, userId) =>
    req(`/questions/${id}/vote`, { method: "POST", body: JSON.stringify({ userId }) }),
  postAnswer:     (questionId, data) =>
    req(`/questions/${questionId}/answers`, { method: "POST", body: JSON.stringify(data) }),
  voteAnswer:     (id, userId) =>
    req(`/answers/${id}/vote`, { method: "POST", body: JSON.stringify({ userId }) }),
  acceptAnswer:   (id) => req(`/answers/${id}/accept`, { method: "PATCH" }),
  getStats:       () => req("/answers/stats"),
};
