'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Users, Package, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'

export default function CopKutusuPage() {
  const [data, setData] = useState<{ customers: any[]; products: any[] }>({ customers: [], products: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'musteri' | 'urun'>('musteri')
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'musteri' | 'urun'; id: string; name: string } | null>(null)
  const { toast } = useToast()

  const fetchData = () => {
    setLoading(true)
    fetch('/api/cop-kutusu')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }

  useEffect(() => { fetchData() }, [])

  const handleRestore = async (type: 'musteri' | 'urun', id: string) => {
    const res = await fetch(`/api/cop-kutusu/${type}/${id}`, { method: 'PUT' })
    if (res.ok) { toast({ title: 'Geri yüklendi' }); fetchData() }
    else toast({ title: 'Hata', variant: 'destructive' })
  }

  const handleHardDelete = (type: 'musteri' | 'urun', id: string, name: string) => {
    setDeleteConfirm({ type, id, name })
  }

  const confirmHardDelete = async () => {
    if (!deleteConfirm) return
    const res = await fetch(`/api/cop-kutusu/${deleteConfirm.type}/${deleteConfirm.id}`, { method: 'DELETE' })
    if (res.ok) { toast({ title: 'Kalıcı olarak silindi' }); fetchData() }
    else {
      const err = await res.json().catch(() => ({}))
      toast({ title: 'Silinemedi', description: err.error, variant: 'destructive' })
    }
    setDeleteConfirm(null)
  }

  const tabBtn = (key: 'musteri' | 'urun', label: string, count: number, Icon: any) => (
    <button
      onClick={() => setTab(key)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        tab === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
          {count}
        </span>
      )}
    </button>
  )

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Çöp Kutusu</h1>
        <p className="text-gray-500 text-sm">Pasife alınan kayıtlar — geri yükleyebilir veya kalıcı silebilirsiniz</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabBtn('musteri', 'Müşteriler', data.customers.length, Users)}
        {tabBtn('urun', 'Ürünler', data.products.length, Package)}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : tab === 'musteri' ? (
        <div className="space-y-2">
          {data.customers.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Trash2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Silinmiş müşteri yok</p>
              </CardContent>
            </Card>
          ) : data.customers.map((c: any) => (
            <Card key={c.id} className="border-gray-200 bg-gray-50">
              <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="bg-gray-200 p-2 rounded-lg shrink-0">
                    <Users className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-700">{c.user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{c.user?.email}</p>
                    {c.orders?.length > 0 && (
                      <p className="text-xs text-orange-500 mt-0.5">{c.orders.length} siparişi var — silinirse siparişler de silinir</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50"
                    onClick={() => handleRestore('musteri', c.id)}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Geri Yükle
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => handleHardDelete('musteri', c.id, c.user?.name || '')}
                    title="Kalıcı sil"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Kalıcı Sil
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data.products.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Trash2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Silinmiş ürün yok</p>
              </CardContent>
            </Card>
          ) : data.products.map((p: any) => (
            <Card key={p.id} className="border-gray-200 bg-gray-50">
              <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="bg-gray-200 p-2 rounded-lg shrink-0">
                    <Package className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-700">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.category} • {formatCurrency(p.salePrice)}</p>
                    {p.orderItems?.length > 0 && (
                      <p className="text-xs text-orange-500 mt-0.5">{p.orderItems.length} sipariş kaydında var — silinirse sipariş detayları etkilenir</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50"
                    onClick={() => handleRestore('urun', p.id)}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Geri Yükle
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => handleHardDelete('urun', p.id, p.name)}
                    title="Kalıcı sil"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Kalıcı Sil
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              Kalıcı Sil
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">"{deleteConfirm?.name}"</span> kalıcı olarak silinecek.
            </p>
            <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-3">
              <p className="text-sm text-red-800">
                <span className="font-semibold">Dikkat:</span> Bu işlem geri alınamaz. Kayıt veritabanından tamamen kaldırılacaktır.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Vazgeç</Button>
            <Button variant="destructive" onClick={confirmHardDelete} className="flex-1">Evet, Kalıcı Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
