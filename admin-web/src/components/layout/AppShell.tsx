import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BookOpenText, Boxes, LogOut, Users, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/users', label: 'Pengguna', icon: Users },
  { to: '/surahs', label: 'Surah & Ayat', icon: BookOpenText },
  { to: '/assets', label: 'Aset', icon: Boxes },
]

export default function AppShell() {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r bg-background md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <span className="text-lg font-semibold tracking-tight">🕌 HAMIM</span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ADMIN
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col md:pl-60">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
          {/* Nav mobile */}
          <nav className="flex gap-1 md:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-2 py-1 text-xs font-medium',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )
                }
              >
                <item.icon className="size-4" />
              </NavLink>
            ))}
          </nav>
          <div className="hidden text-sm text-muted-foreground md:block">Dashboard Admin HAMIM</div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {admin?.email?.slice(0, 2).toUpperCase() ?? 'AD'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden leading-tight sm:block">
                <div className="text-sm font-medium">{admin?.email}</div>
                <div className="text-[11px] text-muted-foreground">Administrator</div>
              </div>
            </div>
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Keluar"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
