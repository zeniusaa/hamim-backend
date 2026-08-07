import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, apiGet, clearToken, getToken, setToken, type ApiError } from '@/lib/api'
import type { AdminMe } from '@/types'

interface LoginResult {
  admin: { id: string; email: string; role: string }
  accessToken: string
}

interface AuthContextValue {
  admin: AdminMe | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminMe | null>(null)
  const [loading, setLoading] = useState(true)

  // Saat halaman di-refresh: cek token tersimpan dengan GET /admin/me
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!getToken()) {
        setLoading(false)
        return
      }
      try {
        const me = await apiGet<AdminMe>('/me')
        if (!cancelled) setAdmin(me)
      } catch (e) {
        const err = e as ApiError
        // 401 sudah auto-clear token di api.ts; selain itu token dianggap basi
        if (err.status !== 401) clearToken()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<LoginResult>('/login', { method: 'POST', body: { email, password }, token: null })
    setToken(result.accessToken)
    setAdmin({ id: result.admin.id, email: result.admin.email, role: result.admin.role })
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setAdmin(null)
  }, [])

  return <AuthContext.Provider value={{ admin, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return ctx
}
