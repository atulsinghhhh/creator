export async function fetchCsrfToken(): Promise<string> {
  const res = await fetch("/api/auth/csrf-token");
  const data = await res.json();
  return data.csrfToken as string;
}

interface PostJsonResult<T> {
  ok: boolean;
  status: number;
  data: T;
}

/** Primes a fresh CSRF token, then POSTs JSON with it attached as a header. */
export async function postJson<T = Record<string, unknown>>(
  url: string,
  body: unknown
): Promise<PostJsonResult<T>> {
  const csrfToken = await fetchCsrfToken();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}
