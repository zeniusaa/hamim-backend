import { useEffect, useState } from 'react'
import {
  BookOpenText,
  Crown,
  Gauge,
  ListChecks,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  Zap,
} from 'lucide-react'
import { apiGet } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface Overview {
  users: { total: number; deleted: number; premium_active: number; admins: number; new_7d: number }
  content: { surahs: number; ayahs: number; quiz_questions: number; quiz_options: number }
  learning: { ayah_completed: number; quiz_attempts: number; quiz_correct: number; accuracy: number }
  activity: { active_today: number }
}

interface LeaderboardEntry {
  rank: number
  user_id: string
  display_name: string | null
  email: string
  deleted: boolean
  total_juz_completed: number
  current_level: number
}

// Grafik batang CSS sederhana (tanpa library chart — hemat bundle)
function MiniBars({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex h-24 items-end gap-1.5">
      {data.map((d) => (
        <div key={d.label} className="group flex flex-1 flex-col items-center gap-1">
          <div className="text-[10px] font-medium text-muted-foreground">{d.value}</div>
          <div
            className={cn('w-full rounded-t', color)}
            style={{ height: `${Math.max(4, (d.value / max) * 72)}px` }}
            title={`${d.label}: ${d.value}`}
          />
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null)
  const [quizActivity, setQuizActivity] = useState<{ date: string; attempts: number }[] | null>(null)
  const [userGrowth, setUserGrowth] = useState<{ date: string; new_users: number }[] | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [ov, lb, qa, ug] = await Promise.all([
          apiGet<Overview>('/analytics/overview'),
          apiGet<LeaderboardEntry[]>('/analytics/leaderboard?limit=10'),
          apiGet<{ date: string; attempts: number }[]>('/analytics/quiz-activity?days=7'),
          apiGet<{ date: string; new_users: number }[]>('/analytics/user-growth?days=14'),
        ])
        setOverview(ov)
        setLeaderboard(lb)
        setQuizActivity(qa)
        setUserGrowth(ug)
      } catch {
        // biarkan kosong
      }
    })()
  }, [])

  const shortLabel = (iso: string) => {
    const [, m, d] = iso.split('-')
    return `${+m}/${+d}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan pengguna, konten, dan aktivitas belajar HAMIM.</p>
      </div>

      {/* Statistik user */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengguna</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overview ? (
              <div className="text-3xl font-bold">
                {overview.users.total}
                <span className="ml-2 text-sm font-normal text-emerald-600">
                  +{overview.users.new_7d} / 7 hari
                </span>
              </div>
            ) : (
              <Skeleton className="h-9 w-24" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Premium Aktif</CardTitle>
            <Crown className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overview ? (
              <div className="text-3xl font-bold text-amber-500">{overview.users.premium_active}</div>
            ) : (
              <Skeleton className="h-9 w-16" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aktif Hari Ini</CardTitle>
            <Zap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overview ? (
              <div className="text-3xl font-bold">{overview.activity.active_today}</div>
            ) : (
              <Skeleton className="h-9 w-16" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Akurasi Kuis</CardTitle>
            <Gauge className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overview ? (
              <div className="text-3xl font-bold">
                {overview.learning.accuracy}
                <span className="text-sm font-normal text-muted-foreground">%</span>
              </div>
            ) : (
              <Skeleton className="h-9 w-16" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Konten & pembelajaran */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpenText className="size-4" /> Konten
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview ? (
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Surah', value: overview.content.surahs },
                  { label: 'Ayat', value: overview.content.ayahs },
                  { label: 'Soal Kuis', value: overview.content.quiz_questions },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border p-3">
                    <div className="text-2xl font-bold">{s.value.toLocaleString('id-ID')}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <Skeleton className="h-20 w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4" /> Pembelajaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview ? (
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Ayat Selesai', value: overview.learning.ayah_completed },
                  { label: 'Jawaban Quiz', value: overview.learning.quiz_attempts },
                  { label: 'Benar', value: overview.learning.quiz_correct },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border p-3">
                    <div className="text-2xl font-bold">{s.value.toLocaleString('id-ID')}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <Skeleton className="h-20 w-full" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grafik */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4" /> Aktivitas Kuis 7 Hari Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quizActivity ? (
              <MiniBars
                color="bg-primary"
                data={quizActivity.map((d) => ({ label: shortLabel(d.date), value: d.attempts }))}
              />
            ) : (
              <Skeleton className="h-24 w-full" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="size-4" /> Pengguna Baru 14 Hari
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userGrowth ? (
              <MiniBars
                color="bg-emerald-500"
                data={userGrowth.map((d) => ({ label: shortLabel(d.date), value: d.new_users }))}
              />
            ) : (
              <Skeleton className="h-24 w-full" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4" /> Papan Peringkat (Top 10)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {!leaderboard && <Skeleton className="m-4 h-40" />}
            {leaderboard?.map((e, i) => (
              <div key={e.user_id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    i === 0
                      ? 'bg-amber-100 text-amber-700'
                      : i === 1
                        ? 'bg-slate-200 text-slate-700'
                        : i === 2
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-muted text-muted-foreground'
                  )}
                >
                  {e.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{e.display_name || e.email}</div>
                  <div className="truncate text-xs text-muted-foreground">{e.email}</div>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
                  <span>Level {e.current_level}</span>
                  <span className="font-semibold text-foreground">{e.total_juz_completed} juz</span>
                </div>
              </div>
            ))}
            {leaderboard?.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Belum ada data papan peringkat.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <Crown className="size-4 shrink-0" />
        Fitur manajemen konten (tambah/edit surah, ayat, soal) menyusul di tahap berikutnya.
      </div>
    </div>
  )
}
