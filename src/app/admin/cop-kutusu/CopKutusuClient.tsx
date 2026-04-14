'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Users, Package, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'

interface CopKutusuClientProps {
  initialData: { customers: any[]; products: any[] }
  session: any
}

export default function CopKutusuClient({ initialData, session }: CopKutusuClientProps) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'musteri' | 'urun'>('musteri')
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'musteri' | 'urun'; id: string; name: string } | null>(null)
  const { toast } = useToast()

  const fetchData = async () => {
    const r = await fetch('/api/cop-kutusu')
    const d = await r.json()
    setData(d)
  }

  const handleRestore = async (type: 'musteri' | 'urun', id: string) => {
    const res = await fetch(`/api/cop-kutusu/${type}/${id}`, { method: 'PUT' })
    if (res.ok) { 
      toast({ title: 'Kayıt geri yüklendi', description: 'İlgili veri artık aktif listelerde görünecektir.' })
      fetchData() 
    }
    else toast({ title: 'İşlem başarısız', variant: 'destructive' })
  }

  const handleHardDelete = (type: 'musteri' | 'urun', id: string, name: string) => {
    setDeleteConfirm({ type, id, name })
  }

  const confirmHardDelete = async () => {
    if (!deleteConfirm) return
    const res = await fetch(`/api/cop-kutusu/${deleteConfirm.type}/${deleteConfirm.id}`, { method: 'DELETE' })
    if (res.ok) { 
      toast({ title: 'Kalıcı silme başarılı', description: 'Veri sistemden tamamen temizlendi.' })
      fetchData() 
    }
    else {
      const err = await res.json().catch(() => ({}))
      toast({ title: 'Silme engellendi', description: err.error, variant: 'destructive' })
    }
    setDeleteConfirm(null)
  }

  const tabBtn = (key: 'musteri' | 'urun', label: string, count: number, Icon: any) => (
    <button
      onClick={() => setTab(key)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
        tab === key ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count > 0 && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${tab === key ? 'bg-blue-400 text-white' : 'bg-slate-100 text-slate-500'}`}>
          {count}
        </span>
      )}
    </button>
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Çöp Kutusu</h1>
          <p className="text-gray-500 text-sm">Pasife alınan kayıtlar — geri yükleyebilir veya kalıcı silebilirsiniz</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
        {tabBtn('musteri', 'Müşteriler', data.customers.length, Users)}
        {tabBtn('urun', 'Ürünler', data.products.length, Package)}
        <div className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 italic text-[10px] font-bold">
           <AlertTriangle className="h-3 w-3" />
           BU ALANDAKİ İŞLEMLER GERİ ALINAMAYABİLİR
        </div>
      </div>

      <div className="space-y-3">
        {tab === 'musteri' ? (
          <>
            {data.customers.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-20 text-center text-slate-400">
                  <Trash2 className="h-10 w-10 opacity-20 mx-auto mb-3" />
                  <p className="font-medium">Silinmiş müşteri bulunmuyor</p>
                </CardContent>
              </Card>
            ) : data.customers.map((c: any) => (
              <Card key={c.id} className="border-slate-200 bg-slate-50/50 hover:bg-white transition-all group overflow-hidden">
                <CardContent className="py-4 px-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="bg-slate-200 p-3 rounded-xl shrink-0 group-hover:bg-blue-100 transition-colors">
                      <Users className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 uppercase tracking-tight">{c.user?.name}</p>
                      <p className="text-xs text-slate-500 font-medium truncate">{c.user?.email}</p>
                      {c.orders?.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5 bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-100 w-fit">
                           <AlertTriangle className="h-3 w-3" />
                           <span className="text-[10px] font-black">{c.orders.length} SİPARİŞİ VAR</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 md:border-l pl-0 md:pl-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 font-bold text-green-700 border-green-200 hover:bg-green-50 shadow-sm"
                      onClick={() => handleRestore('musteri', c.id)}
                    >
                      <RefreshCw className="h-4 w-4 mr-1.5" /> Geri Yükle
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-9 font-bold shadow-sm"
                      onClick={() => handleHardDelete('musteri', c.id, c.user?.name || '')}
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" /> Kalıcı Sil
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            {data.products.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-20 text-center text-slate-400">
                  <Trash2 className="h-10 w-10 opacity-20 mx-auto mb-3" />
                  <p className="font-medium">Silinmiş ürün bulunmuyor</p>
                </CardContent>
              </Card>
            ) : data.products.map((p: any) => (
              <Card key={p.id} className="border-slate-200 bg-slate-50/50 hover:bg-white transition-all group overflow-hidden">
                <CardContent className="py-4 px-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="bg-slate-200 p-3 rounded-xl shrink-0 group-hover:bg-orange-100 transition-colors">
                      <Package className="h-5 w-5 text-slate-600 group-hover:text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 uppercase tracking-tight">{p.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{p.category} • <span className="text-blue-600 font-bold">{formatCurrency(p.salePrice)}</span></p>
                      {p.orderItems?.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5 bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-100 w-fit">
                           <AlertTriangle className="h-3 w-3" />
                           <span className="text-[10px] font-black">{p.orderItems.length} SİPARİŞTE KAYITLI</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 md:border-l pl-0 md:pl-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 font-bold text-green-700 border-green-200 hover:bg-green-50 shadow-sm"
                      onClick={() => handleRestore('urun', p.id)}
                    >
                      <RefreshCw className="h-4 w-4 mr-1.5" /> Geri Yükle
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-9 font-bold shadow-sm"
                      onClick={() => handleHardDelete('urun', p.id, p.name)}
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" /> Kalıcı Sil
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="bg-red-100 p-2.5 rounded-xl border border-red-200 shadow-sm">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <span className="font-black text-slate-900 uppercase tracking-tight">Kalıcı Olarak Temizle</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 pt-4">
            <p className="text-slate-600 leading-relaxed">
              <span className="font-black text-slate-800">"{deleteConfirm?.name}"</span> kaydını veritabanından tamamen silmek üzeresiniz.
            </p>
            <div className="bg-amber-50 border-l-4 border-amber-500 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                 <Trash2 className="h-4 w-4 text-amber-700" />
                 <p className="text-xs font-black text-amber-800 tracking-wider">HARİCİ UYARI</p>
              </div>
              <p className="text-sm text-amber-900 font-medium">
                Bu işlem geri döndürülemez. Eğer bu kayda bağlı faturalar veya siparişler varsa, bu silme işlemi veritabanı bütünlüğü gereği <b className="text-red-700 underline">başarısız</b> olabilir.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1 font-bold h-11 border-slate-200">İptal</Button>
            <Button variant="destructive" onClick={confirmHardDelete} className="flex-1 font-black h-11 shadow-lg shadow-red-100">ONAYLA VE SİL</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
