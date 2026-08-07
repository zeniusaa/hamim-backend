import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { BookOpenText, ChevronRight, Search } from 'lucide-react'
import { apiGet, type ApiError } from '@/lib/api'
import type { Pagination, SurahListItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

const LIMIT = 20

export default function SurahsPage() {
  const [surahs, setSurahs] = useState<SurahListItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (search) params.set('search', search)
      const data = await apiGet<{ surahs: SurahListItem[]; pagination: Pagination }>(`/surahs?${params}`)
      setSurahs(data.surahs)
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Surah & Ayat</h1>
          <p className="text-sm text-muted-foreground">
            Lihat daftar surah, ayat, audio, dan soal kuis tiap ayat.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Cari surah…"
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
                  <TableHead className="w-14">No.</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Arab</TableHead>
                  <TableHead className="text-center">Ayat</TableHead>
                  <TableHead className="text-center">Juz</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surahs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Surah tidak ditemukan.
                    </TableCell>
                  </TableRow>
                )}
                {surahs.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-semibold text-muted-foreground">{s.number}</TableCell>
                    <TableCell>
                      <div className="font-medium">{s.name_transliteration}</div>
                      <div className="text-xs text-muted-foreground">{s.name_translation_id}</div>
                    </TableCell>
                    <TableCell className="text-lg" dir="rtl">
                      {s.name_arabic}
                    </TableCell>
                    <TableCell className="text-center">{s._count?.ayahs ?? s.total_ayah}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{s.revelation_type === 'makkiyah' ? 'Makkiyah' : 'Madaniyah'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link to={`/surahs/${s.id}`} />}
                      >
                        Ayat & soal <ChevronRight className="ml-1 size-3.5" />
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
            {pagination.total} surah · halaman {pagination.page}/{pagination.total_pages}
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

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BookOpenText className="size-3.5" />
        Klik surah untuk lihat daftar ayat, audio, dan soal kuis.
      </div>
    </div>
  )
}
