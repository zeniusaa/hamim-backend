// Klien API admin — fetch wrapper + penanganan error terpusat.
// Semua request relatif ke /admin (di-proxy Vite ke backend saat dev).

export class ApiError extends Error {
  status: number
  errors: { field: string; message: string }[] | null

  constructor(status: number, message: string, errors: { field: string; message: string }[] | null = null) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

const TOKEN_KEY = 'hamim_admin_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string | null
}

export async function api<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token = getToken() } = opts

  const res = await fetch(`/admin${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const json = (await res.json().catch(() => null)) as {
    success?: boolean
    message?: string
    errors?: { field: string; message: string }[] | null
    data?: T
  } | null

  if (!res.ok) {
    // Token basi/expired → langsung lempar, dipakai AuthContext buat logout
    if (res.status === 401) {
      clearToken()
    }
    throw new ApiError(res.status, json?.message || `Gagal (${res.status})`, json?.errors ?? null)
  }

  return json?.data as T
}

export const apiGet = <T>(path: string) => api<T>(path)
export const apiPost = <T>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body })
export const apiPatch = <T>(path: string, body?: unknown) => api<T>(path, { method: 'PATCH', body })
export const apiDelete = <T>(path: string) => api<T>(path, { method: 'DELETE' })

// Helper format tanggal (ISO → "7 Agu 2026, 14:30")
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
