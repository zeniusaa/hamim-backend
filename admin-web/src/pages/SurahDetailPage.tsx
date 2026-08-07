import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, AudioLines, CheckCircle2, ListChecks, Play } from 'lucide-react'
import { apiGet, type ApiError } from '@/lib/api'
import type { AyahDetail, AyahListItem, Pagination, SurahDetail } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

const LIMIT = 20

export default function SurahDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [surah, setSurah] = useState<SurahDetail | null>(null)
  const [ayahs, setAyahs] = useState<AyahListItem[] | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedAyah, setSelectedAyah] = useState<AyahDetail | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [detail, ayahList] = await Promise.all([
        apiGet<SurahDetail>(`/surahs/${id}`),
        apiGet<{ ayahs: SurahDetail['ayahs']; pagination: Pagination }>(
          `/surahs/${id}/ayahs?page=${page}&limit=${LIMIT}`
        ),
      ])
      setSurah(detail)
      setAyahs(ayahList.ayahs)
      setPagination(ayahList.pagination)
    } catch (err) {
      toast.error((err as ApiError).message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [id, page])

  useEffect(() => {
    load()
  }, [load])

  const openAyah = async (ayahId: string) => {
    try {
      const detail = await apiGet<AyahDetail>(`/ayahs/${ayahId}`)
      setSelectedAyah(detail)
    } catch (err) {
      toast.error((err as ApiError).message || 'Gagal memuat ayat')
    }
  }

  if (loading && !surah) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link to="/surahs" />}>
          <ArrowLeft className="mr-1 size-4" /> Surah
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {surah?.number}. {surah?.name_transliteration}
            <span className="ml-3 text-xl font-normal text-muted-foreground" dir="rtl">
              {surah?.name_arabic}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {surah?.name_translation_id} · {surah?.total_ayah} ayat · {surah?.total_groups} kelompok · mulai juz{' '}
            {surah?.juz_start}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AudioLines className="size-4" /> Kelompok Ayat ({surah?.total_groups ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Kelompok</TableHead>
                <TableHead>Ayat</TableHead>
                <TableHead className="text-center">Jumlah</TableHead>
                <TableHead>Qari</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(surah?.groups ?? []).map((g) => (
                <TableRow key={g.audio_id}>
                  <TableCell className="font-semibold">{g.audio_order}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {g.ayah_start === g.ayah_end ? g.ayah_start : `${g.ayah_start}–${g.ayah_end}`}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">{g.ayah_count} ayat</TableCell>
                  <TableCell className="text-muted-foreground">{g.qari_name}</TableCell>
                </TableRow>
              ))}
              {(surah?.groups ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Belum ada audio / kelompok ayat di surah ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daftar Ayat</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Ayat</TableHead>
                  <TableHead>Juz</TableHead>
                  <TableHead className="text-center">Soal kuis</TableHead>
                  <TableHead className="text-center">Audio</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ayahs?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Belum ada ayat di surah ini.
                    </TableCell>
                  </TableRow>
                )}
                {(ayahs ?? []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-semibold">{a.ayah_number}</TableCell>
                    <TableCell className="text-muted-foreground">Juz {a.juz_number}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <ListChecks className="size-3.5" /> {a._count?.quiz_questions ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <AudioLines className="size-3.5" /> {a._count?.audio_files ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openAyah(a.id)}>
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
            {pagination.total} ayat · halaman {pagination.page}/{pagination.total_pages}
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

      {/* Dialog detail ayat */}
      <Dialog open={!!selectedAyah} onOpenChange={(o) => !o && setSelectedAyah(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAyah?.surah.number}:{selectedAyah?.ayah_number} · {selectedAyah?.surah.name_transliteration}
            </DialogTitle>
          </DialogHeader>
          {selectedAyah && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-right text-2xl leading-loose" dir="rtl">
                  {selectedAyah.text_uthmani}
                </p>
              </div>
              {selectedAyah.translation_id && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Arti:</span> {selectedAyah.translation_id}
                </p>
              )}

              {/* Audio */}
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <AudioLines className="size-4" /> Audio ({selectedAyah.audio_files.length})
                </h3>
                {selectedAyah.audio_files.length === 0 && (
                  <p className="text-sm text-muted-foreground">Belum ada audio.</p>
                )}
                <div className="space-y-1.5">
                  {selectedAyah.audio_files.map((af) => (
                    <div key={af.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>
                        {af.qari_name || `Qari ${af.audio_order}`}
                        {af.duration_seconds ? ` · ${af.duration_seconds}s` : ''}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        render={
                          <a href={af.file_url} target="_blank" rel="noreferrer" title="Putar" />
                        }
                      >
                        <Play className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Soal quiz */}
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <ListChecks className="size-4" /> Soal Kuis ({selectedAyah.quiz_questions.length})
                </h3>
                {selectedAyah.quiz_questions.length === 0 && (
                  <p className="text-sm text-muted-foreground">Belum ada soal kuis.</p>
                )}
                <div className="space-y-3">
                  {selectedAyah.quiz_questions.map((q) => (
                    <div key={q.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{q.question_text}</p>
                        <Badge variant="outline" className="shrink-0">
                          {q.type}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {q.options.map((o) => (
                          <span
                            key={o.id}
                            className={
                              'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ' +
                              (o.is_correct ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'bg-muted')
                            }
                          >
                            {o.is_correct && <CheckCircle2 className="size-3" />}
                            {o.option_text}
                          </span>
                        ))}
                      </div>
                      {q._count?.attempts != null && (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {q._count.attempts}× dijawab user · bahasa: {q.language?.code ?? '?'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
