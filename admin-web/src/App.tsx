import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import AppShell from '@/components/layout/AppShell'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import UsersPage from '@/pages/UsersPage'
import SurahsPage from '@/pages/SurahsPage'
import SurahDetailPage from '@/pages/SurahDetailPage'
import AssetsPage from '@/pages/AssetsPage'
import { Skeleton } from '@/components/ui/skeleton'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-40" />
      </div>
    )
  }
  if (!admin) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/surahs" element={<SurahsPage />} />
          <Route path="/surahs/:id" element={<SurahDetailPage />} />
          <Route path="/assets" element={<AssetsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
