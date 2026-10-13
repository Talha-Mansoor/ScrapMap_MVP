async function parseJsonSafe(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function apiGet(path) {
  const res = await fetch(path, {
    credentials: "include"
  });

  const body = await parseJsonSafe(res);
  if (!res.ok) throw new Error(body?.message || `Request failed (${res.status})`);
  return body;
}

export async function apiSend(method, path, payload) {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined
  });

  if (res.status === 204) return null;

  const body = await parseJsonSafe(res);
  if (!res.ok) throw new Error(body?.message || `Request failed (${res.status})`);
  return body;
}