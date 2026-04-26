const BACKEND_URL = process.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

async function get<T>(baseUrl: string, path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`)
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

async function post<T>(baseUrl: string, path: string, body: unknown, timeoutMs = 10_000): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

// --- Backend ---

export interface AnalyzeRequest {
  summary: string
  active_window: string
  screenshot_b64: string
  tier: 1 | 2 | 3
}

export const backend = {
  health: () => get<{ status: string }>(BACKEND_URL, '/health'),
  analyze: (payload: AnalyzeRequest) => post<void>(BACKEND_URL, '/analyze', payload),
}

