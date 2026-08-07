import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Crown, RefreshCcw, RotateCcw, Search, ShieldAlert, ShieldCheck, UserRound } from 'lucide-react'
import { apiDelete, apiGet, apiPatch, apiPost, formatDate, type ApiError } from '@/lib/api'
import type { Pagination, UserDetail, UserListItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'

const LIMIT = 20

export default function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<UserDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (search) params.set('search', search)
      const data = await apiGet<{ users: UserListItem[]; pagination: Pagination }>(`/users?${params}`)
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (err) {
      toast.error((err as ApiError).message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    load()
  }, [load])

  const openDetail = async (id: string) => {
    try {
      const detail = await apiGet<UserDetail>(`/users/${id}`)
      setSelected(detail)
      setDetailOpen(true)
    } catch (err) {
      toast.error((err as ApiError).message || 'Gagal memuat detail')
    }
  }

  const actPremium = async (is_premium: boolean, duration_days?: number) => {
    if (!selected) return
    try {
      await apiPatch(`/users/${selected.id}/premium`, { is_premium, duration_days })
      toast.success(is_premium ? 'Premium diberikan' : 'Premium dicabut')
      setDetailOpen(false)
      load()
    } catch (err) {
      toast.error((err as ApiError).message || 'Gagal')
    }
  }

  const actResetLives = async () => {
    if (!selected) return
    try {
      await apiPatch(`/users/${selected.id}/lives`, {})
      toast.success('Nyawa direset penuh')
      setDetailOpen(false)
      load()
    } catch (err) {
      toast.error((err as ApiError).message || 'Gagal')
    }
  }

  const actResetProgress = async () => {
    if (!selected) return
    try {
      const r = await apiPost<{ progress_deleted: number; attempts_deleted: number; levels_deleted: number }>(
        `/users/${selected.id}/reset-progress`
      )
      toast.success(`Progress direset (${r.progress_deleted} ayat, ${r.attempts_deleted} jawaban quiz)`)
      setDetailOpen(false)
      load()
    } catch (err) {
      toast.error((err as ApiError).message || 'Gagal')
    }
  }

  const actDelete = async () => {
    if (!selected) return
    try {
      await apiDelete(`/users/${selected.id}`)
      toast.success('Akun dinonaktifkan')
      setDetailOpen(false)
      load()
    } catch (err) {
      toast.error((err as ApiError).message || 'Gagal')
    }
  }

  const actRestore = async () => {
    if (!selected) return
    try {
      await apiPost(`/users/${selected.id}/restore`)
      toast.success('Akun dipulihkan')
      setDetailOpen(false)
      load()
    } catch (err) {
      toast.error((err as ApiError).message || 'Gagal')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pengguna</h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun, premium, nyawa, dan progress belajar pengguna.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Cari email / nama…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1)
                setSearch(searchInput.trim())
              }
            }}
            className="w-56"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setPage(1)
              setSearch(searchInput.trim())
            }}
          >
            <Search className="size-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Daftar</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Tidak ada pengguna ditemukan.
                    </TableCell>
                  </TableRow>
                )}
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <UserRound className="size-4 text-muted-foreground" />
                        {u.profile?.display_name || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      {u.leaderboard_snapshot ? `Level ${u.leaderboard_snapshot.current_level}` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.deleted_at && <Badge variant="destructive">Nonaktif</Badge>}
                        {u.lives?.is_premium && (
                          <Badge className="bg-amber-500 text-white">
                            <Crown className="mr-1 size-3" /> Premium
                          </Badge>
                        )}
                        {u.role === 'ADMIN' && <Badge variant="secondary">Admin</Badge>}
                        {!u.email_verified && <Badge variant="outline">Belum verifikasi</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openDetail(u.id)}>
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {pagination.total} pengguna · halaman {pagination.page}/{pagination.total_pages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}

      {/* Dialog detail user */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.profile?.display_name || selected?.email}
            </DialogTitle>
            <DialogDescription>{selected?.email}</DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Nyawa</div>
                  <div className="text-lg font-semibold">
                    {selected.lives?.current_lives ?? 0}/{selected.lives?.max_lives ?? 0}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Level</div>
                  <div className="text-lg font-semibold">
                    {selected.leaderboard_snapshot?.current_level ?? 1}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Ayat selesai</div>
                  <div className="text-lg font-semibold">{selected.stats.ayah_completed}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Quiz benar</div>
                  <div className="text-lg font-semibold">
                    {selected.stats.quiz_correct}/{selected.stats.quiz_attempts}
                  </div>
                </div>
                <div className="col-span-2 rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Premium</div>
                  <div className="text-sm">
                    {selected.lives?.is_premium ? (
                      <>
                        Aktif
                        {selected.lives.premium_expires_at && (
                          <span className="text-muted-foreground">
                            {' '}
                            · s.d. {formatDate(selected.lives.premium_expires_at)}
                          </span>
                        )}
                      </>
                    ) : (
                      'Tidak'
                    )}
                  </div>
                </div>
              </div>

              {/* Progress terakhir: juz berapa, surah apa, kelompok ayat berapa */}
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Progress Terakhir ({selected.recent_progress?.length ?? 0})
                </div>
                {selected.recent_progress?.length ? (
                  <div className="divide-y rounded-lg border">
                    {selected.recent_progress.map((p, i) => (
                      <div key={`${p.ayah_id}-${p.stage}-${i}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <Badge variant="secondary" className="shrink-0 font-normal capitalize">
                          {p.stage}
                        </Badge>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium">
                            Juz {p.juz_number} · {p.surah.number}. {p.surah.name_transliteration}
                          </span>{' '}
                          <span className="text-muted-foreground">· ayat {p.ayah_number}</span>
                          {p.group && (
                            <span className="text-muted-foreground">
                              {' '}
                              · kelompok {p.group.audio_order} ({p.group.ayah_start}–
                              {p.group.ayah_end})
                            </span>
                          )}
                        </span>
                        {p.completed_at && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatDate(p.completed_at)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">
                    Belum ada progress belajar.
                  </p>
                )}
              </div>

              {selected.deleted_at ? (
                <AlertDialog>
                  <AlertDialogTrigger render={<Button className="w-full" variant="outline" />}>
                    <ShieldCheck className="mr-2 size-4" /> Pulihkan akun
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Pulihkan akun ini?</AlertDialogTitle>
                      <AlertDialogDescription>
                        User bisa login dan lanjut belajar seperti biasa. Dihapus {formatDate(selected.deleted_at)}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={actRestore}>Pulihkan</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {selected.lives?.is_premium ? (
                    <Button variant="outline" onClick={() => actPremium(false)}>
                      <Crown className="mr-2 size-4" /> Cabut premium
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => actPremium(true, 30)}>
                        <Crown className="mr-2 size-4" /> Premium 30 hari
                      </Button>
                      <Button variant="outline" onClick={() => actPremium(true)}>
                        <Crown className="mr-2 size-4" /> Premium permanen
                      </Button>
                    </>
                  )}
                  <Button variant="outline" onClick={actResetLives}>
                    <RotateCcw className="mr-2 size-4" /> Reset nyawa
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="outline" />}>
                      <RefreshCcw className="mr-2 size-4" /> Reset progress
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset semua progress belajar?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Semua ayat selesai, riwayat quiz, dan level akan dihapus permanen. Nyawa tidak terpengaruh.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={actResetProgress}>Ya, reset</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="destructive" />}>
                      <ShieldAlert className="mr-2 size-4" /> Nonaktifkan
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Nonaktifkan akun ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Akun ditandai nonaktif dan refresh token langsung ditolak. Sesuai desain app, user bisa
                          memulihkannya sendiri dengan login ulang.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={actDelete}>Nonaktifkan</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
