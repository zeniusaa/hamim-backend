import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowUpCircle, Boxes, Image as ImageIcon, Music, Package } from 'lucide-react'
import { apiGet, apiPost, type ApiError } from '@/lib/api'
import type { AssetSummary } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [bumping, setBumping] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setAssets(await apiGet<AssetSummary>('/assets'))
    } catch (err) {
      toast.error((err as ApiError).message || 'Gagal memuat aset')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const bump = async (bundleId: string) => {
    setBumping(bundleId)
    try {
      const r = await apiPost<{ name: string; version: number }>(`/assets/bundles/${bundleId}/bump-version`)
      toast.success(`Versi "${r.name}" dinaikkan ke v${r.version}`)
      load()
    } catch (err) {
      toast.error((err as ApiError).message || 'Gagal menaikkan versi')
    } finally {
      setBumping(null)
    }
  }

  if (loading && !assets) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Aset Aplikasi</h1>
        <p className="text-sm text-muted-foreground">
          Ikon, background, musik, dan bundle yang diunduh aplikasi mobile.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="size-4" /> Ikon ({assets?.icons.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {assets?.icons.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted">
                  <span>{i.name}</span>
                  <Badge variant="outline">v{i.version}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="size-4" /> Background ({assets?.backgrounds.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {assets?.backgrounds.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted">
                  <span>{b.name}</span>
                  <Badge variant="outline">v{b.version}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Music className="size-4" /> Musik ({assets?.music.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {assets?.music.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted">
                  <span>{m.name}</span>
                  <Badge variant="outline">v{m.version}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4" /> Bundle ({assets?.bundles.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assets?.bundles.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Boxes className="size-3.5 text-muted-foreground" />
                    <span className="truncate font-medium">{b.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {b.bundle_items.length} item · diunduh {b._count?.downloaded_by_users ?? 0}×
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">v{b.version}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bumping === b.id}
                    onClick={() => bump(b.id)}
                    title="Naikkan versi bundle (app mobile akan download ulang)"
                  >
                    <ArrowUpCircle className="mr-1 size-3.5" />
                    {bumping === b.id ? '…' : 'Bump'}
                  </Button>
                </div>
              </div>
            ))}
            {assets?.bundles.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">Belum ada bundle.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
