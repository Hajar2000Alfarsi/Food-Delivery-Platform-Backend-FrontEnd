// api.js — single source of truth for talking to the backend
const BASE = 'http://localhost:8080/api';
async function api(path, { method='GET', body } = {}) {
 const res = await fetch(BASE + path, {
 method,
 headers: { 'Content-Type':'application/json' },
 body: body ? JSON.stringify(body) : undefined,
 });
 if (res.status === 204) return null; // No Content
 const data = await res.json().catch(() => null);
 if (!res.ok) { // 400 / 404 / 409 / 500
 throw new ApiError(data?.message || 'Request failed', res.status, data?.fieldErrors);
 }
 return data; // Response DTO(s)
}
class ApiError extends Error {
 constructor(msg, status, fieldErrors){ super(msg); this.status=status;
this.fieldErrors=fieldErrors; }
}
