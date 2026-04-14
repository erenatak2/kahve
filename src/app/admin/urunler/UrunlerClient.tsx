'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Search, Trash2, AlertTriangle, Trash, Check } from 'lucide-react'
import { ExcelImportDialog } from '@/components/ExcelImportDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'

type SortKey = 'code' | 'category' | 'name' | 'description' | 'unit' | 'purchasePrice' | 'salePrice' | 'stock'

interface UrunlerClientProps {
  initialProducts: any[]
}

export default function UrunlerClient({ initialProducts }: UrunlerClientProps) {
  const [products, setProducts] = useState<any[]>(initialProducts)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editInlineForm, setEditInlineForm] = useState({ code: '', name: '', category: '', description: '', unit: '', purchasePrice: '', salePrice: '' })
  const [inlineForm, setInlineForm] = useState<{ code: string; name: string; category: string; description: string; unit: string; purchasePrice: string; salePrice: string }>({ code: '', name: '', category: '', description: '', unit: '', purchasePrice: '', salePrice: '' })
  const [showInlineForm, setShowInlineForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('code')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const { toast } = useToast()

  const fetchProducts = () => {
    fetch('/api/urunler').then(r => r.json()).then(d => { setProducts(d); setLoading(false) })
  }

  const handleInlineSubmit = async () => {
    if (!inlineForm.name || !inlineForm.salePrice) {
      toast({ title: 'Ürün adı ve fiyat zorunlu', variant: 'destructive' })
      return
    }
    const res = await fetch('/api/urunler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: inlineForm.code || null,
        name: inlineForm.name,
        category: inlineForm.category,
        description: inlineForm.description,
        unit: inlineForm.unit,
        purchasePrice: inlineForm.purchasePrice || null,
        salePrice: parseFloat(inlineForm.salePrice),
        stock: 0,
        minStock: 0
      }),
    })
    if (res.ok) {
      toast({ title: 'Ürün eklendi' })
      setInlineForm({ code: '', name: '', category: '', description: '', unit: '', purchasePrice: '', salePrice: '' })
      setShowInlineForm(false)
      fetchProducts()
    } else {
      toast({ title: 'Hata', variant: 'destructive' })
    }
  }

  const handleEdit = (p: any) => {
    setEditingId(p.id)
    setEditInlineForm({
      code: p.code || '',
      name: p.name || '',
      category: p.category || '',
      description: p.description || '',
      unit: p.unit || '',
      purchasePrice: p.purchasePrice?.toString() || '',
      salePrice: p.salePrice?.toString() || ''
    })
  }

  const handleInlineUpdate = async (id: string) => {
    if (!editInlineForm.name || !editInlineForm.salePrice) {
      toast({ title: 'Ürün adı ve fiyat zorunlu', variant: 'destructive' })
      return
    }
    const res = await fetch(`/api/urunler/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: editInlineForm.code || null,
        name: editInlineForm.name,
        category: editInlineForm.category,
        description: editInlineForm.description,
        unit: editInlineForm.unit,
        purchasePrice: editInlineForm.purchasePrice || null,
        salePrice: parseFloat(editInlineForm.salePrice),
      }),
    })
    if (res.ok) {
      toast({ title: 'Ürün güncellendi' })
      setEditingId(null)
      fetchProducts()
    } else {
      toast({ title: 'Hata', variant: 'destructive' })
    }
  }

  const handleDelete = (id: string, name: string) => {
    setConfirmAction({
      title: 'Ürünü Pasife Al',
      message: `"${name}" ürünü pasife alınacak. Ürün müşterilere görünmez hale gelecektir.`,
      onConfirm: async () => {
        const res = await fetch(`/api/urunler/${id}`, { method: 'DELETE' })
        if (res.ok) { toast({ title: 'Ürün pasife alındı' }); fetchProducts() }
        else toast({ title: 'Hata', variant: 'destructive' })
        setConfirmAction(null)
      }
    })
  }

  const handleDeleteAll = () => {
    if (products.length === 0) {
      toast({ title: 'Silinecek ürün yok', variant: 'destructive' })
      return
    }
    setConfirmAction({
      title: 'Tüm Ürünleri Sil',
      message: `Tüm ${products.length} ürün kalıcı olarak silinecek. Bu işlem geri alınamaz!`,
      onConfirm: async () => {
        let successCount = 0
        let failCount = 0
        for (const p of products) {
          const res = await fetch(`/api/urunler/${p.id}`, { method: 'DELETE' })
          if (res.ok) successCount++
          else failCount++
        }
        if (failCount === 0) {
          toast({ title: `${successCount} ürün silindi` })
        } else {
          toast({ title: `${successCount} silindi, ${failCount} başarısız`, variant: 'destructive' })
        }
        fetchProducts()
        setConfirmAction(null)
      }
    })
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.code || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    if (a.code && b.code) {
      return a.code.localeCompare(b.code, 'tr', { numeric: true })
    }
    if (a.code && !b.code) return -1
    if (!a.code && b.code) return 1
    return a.id.localeCompare(b.id, 'tr', { numeric: true })
  })

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Ürünler</h1>
          <p className="text-gray-500 text-sm">{filtered.length !== products.length ? `${filtered.length} / ${products.length} ürün` : `${products.length} ürün`}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input className="pl-9 h-9 w-56" placeholder="Kod, ad veya kategori..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" className="h-9" onClick={() => setShowImport(true)}>
             Excel'den Yükle
          </Button>
          <Button variant="destructive" className="h-9" onClick={() => handleDeleteAll()}>
            <Trash className="mr-2 h-4 w-4" />Tümünü Sil
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-3 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap w-24">Kod</th>
                  <th className="px-3 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap w-28">Resim</th>
                  <th className="px-3 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap min-w-[160px]">Ürün Adı</th>
                  <th className="hidden sm:table-cell px-3 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap w-28">Marka</th>
                  <th className="hidden md:table-cell px-3 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap w-24">Paket</th>
                  <th className="hidden md:table-cell px-3 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap w-20">Form</th>
                  <th className="px-3 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap w-24">Ödeme</th>
                  <th className="px-3 py-3 text-left font-semibold text-sm text-gray-700 whitespace-nowrap w-24">Fiyat</th>
                  <th className="px-3 py-3 text-center font-semibold text-sm text-gray-700 whitespace-nowrap w-24">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => editingId === p.id ? (
                  <tr key={`edit-${p.id}`} className="border-b bg-yellow-50" onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleInlineUpdate(p.id); }
                    else if (e.key === 'Escape') { e.preventDefault(); setEditingId(null); }
                  }}>
                    <td className="px-3 py-4 w-28"><Input className="h-10 text-sm w-full" value={editInlineForm.code} onChange={e => setEditInlineForm({...editInlineForm, code: e.target.value})} /></td>
                    <td className="px-3 py-4 w-20">
                      {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-20 w-20 object-contain rounded border bg-white" /> : <div className="h-20 w-20 bg-gray-100 rounded flex items-center justify-center text-base text-gray-400">Yok</div>}
                    </td>
                    <td className="px-3 py-4 min-w-[160px]"><Input className="h-10 text-sm w-full" value={editInlineForm.name} onChange={e => setEditInlineForm({...editInlineForm, name: e.target.value})} required /></td>
                    <td className="hidden sm:table-cell px-3 py-4 w-28"><Input className="h-10 text-sm w-full" value={editInlineForm.category} onChange={e => setEditInlineForm({...editInlineForm, category: e.target.value})} /></td>
                    <td className="hidden md:table-cell px-3 py-4 w-24"><Input className="h-10 text-sm w-full" value={editInlineForm.description} onChange={e => setEditInlineForm({...editInlineForm, description: e.target.value})} /></td>
                    <td className="hidden md:table-cell px-3 py-4 w-20"><Input className="h-10 text-sm w-full" value={editInlineForm.unit} onChange={e => setEditInlineForm({...editInlineForm, unit: e.target.value})} /></td>
                    <td className="hidden lg:table-cell px-3 py-4 w-24">
                      <select className="h-10 text-sm border rounded px-2 w-full bg-white" value={editInlineForm.purchasePrice} onChange={e => setEditInlineForm({...editInlineForm, purchasePrice: e.target.value})}>
                        <option value="">Seç...</option>
                        <option value="Peşin">Peşin</option>
                        <option value="Vadeli">Vadeli</option>
                      </select>
                    </td>
                    <td className="px-3 py-4 w-24"><Input className="h-10 text-sm w-full" type="number" step="0.01" value={editInlineForm.salePrice} onChange={e => setEditInlineForm({...editInlineForm, salePrice: e.target.value})} /></td>
                    <td className="px-2 py-2 w-20">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 bg-green-100" title="Kaydet" onClick={() => handleInlineUpdate(p.id)}><Check className="h-4 w-4 text-green-600" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 bg-gray-100" title="İptal" onClick={() => setEditingId(null)}><span className="text-xs text-gray-600">✕</span></Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-4 w-28">{p.code ? <span className="font-mono text-sm text-gray-900 whitespace-nowrap">{p.code}</span> : <span className="text-gray-300 text-sm">—</span>}</td>
                    <td className="px-3 py-4 w-28">{p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-24 w-24 object-contain rounded border bg-white" /> : <div className="h-24 w-24 bg-gray-100 rounded flex items-center justify-center text-base text-gray-400">Yok</div>}</td>
                    <td className="px-3 py-4 font-medium text-sm min-w-[200px] max-w-[300px] whitespace-normal break-words leading-relaxed">{p.name}</td>
                    <td className="hidden sm:table-cell px-3 py-4 text-gray-600 text-sm w-28 truncate">{p.category || '—'}</td>
                    <td className="hidden md:table-cell px-3 py-4 text-gray-600 text-sm w-24 truncate">{p.description || '—'}</td>
                    <td className="hidden md:table-cell px-3 py-4 text-gray-600 text-sm w-20">{p.unit || '—'}</td>
                    <td className="hidden lg:table-cell px-3 py-4 text-gray-600 text-sm w-24">{p.purchasePrice || '—'}</td>
                    <td className="px-3 py-4 font-semibold text-blue-600 text-base w-24">{formatCurrency(p.salePrice)}</td>
                    <td className="px-3 py-4 w-28">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Düzenle" onClick={() => handleEdit(p)}><Pencil className="h-4 w-4 text-blue-500" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Sil" onClick={() => handleDelete(p.id, p.name)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {showInlineForm && (
                  <tr className="border-b bg-blue-50" onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleInlineSubmit(); }
                    else if (e.key === 'Escape') { e.preventDefault(); setShowInlineForm(false); }
                  }}>
                    <td className="px-3 py-4 w-28"><Input className="h-10 text-sm w-full" placeholder="Kod" value={inlineForm.code} onChange={e => setInlineForm({...inlineForm, code: e.target.value})} /></td>
                    <td className="px-3 py-4 w-28"><div className="h-20 w-20 bg-gray-100 rounded flex items-center justify-center text-base text-gray-400">Yok</div></td>
                    <td className="px-3 py-4 min-w-[160px]"><Input className="h-10 text-sm w-full" placeholder="Ürün Adı *" value={inlineForm.name} onChange={e => setInlineForm({...inlineForm, name: e.target.value})} required /></td>
                    <td className="hidden sm:table-cell px-3 py-4 w-28"><Input className="h-10 text-sm w-full" placeholder="Marka" value={inlineForm.category} onChange={e => setInlineForm({...inlineForm, category: e.target.value})} /></td>
                    <td className="hidden md:table-cell px-3 py-4 w-24"><Input className="h-10 text-sm w-full" placeholder="Paket" value={inlineForm.description} onChange={e => setInlineForm({...inlineForm, description: e.target.value})} /></td>
                    <td className="hidden md:table-cell px-3 py-4 w-20"><Input className="h-10 text-sm w-full" placeholder="Form" value={inlineForm.unit} onChange={e => setInlineForm({...inlineForm, unit: e.target.value})} /></td>
                    <td className="hidden lg:table-cell px-3 py-4 w-24">
                      <select className="h-10 text-sm border rounded px-2 w-full bg-white" value={inlineForm.purchasePrice} onChange={e => setInlineForm({...inlineForm, purchasePrice: e.target.value})}>
                        <option value="">Ödeme</option>
                        <option value="Peşin">Peşin</option>
                        <option value="Vadeli">Vadeli</option>
                      </select>
                    </td>
                    <td className="px-3 py-4 w-28"><Input className="h-10 text-sm w-full" placeholder="Fiyat *" type="number" step="0.01" value={inlineForm.salePrice} onChange={e => setInlineForm({...inlineForm, salePrice: e.target.value})} required /></td>
                    <td className="px-3 py-4 w-28">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 bg-green-100" title="Kaydet" onClick={handleInlineSubmit}><Check className="h-4 w-4 text-green-600" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 bg-gray-100" title="İptal" onClick={() => setShowInlineForm(false)}><span className="text-xs text-gray-600">✕</span></Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-2 border-t bg-gray-50">
            <Button variant="outline" className="w-full h-9 text-xs font-medium" onClick={() => setShowInlineForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Yeni Ürün Ekle
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><div className="bg-orange-100 p-2 rounded-lg"><AlertTriangle className="h-5 w-5 text-orange-600" /></div>{confirmAction?.title}</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">{confirmAction?.message}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)} className="flex-1">Vazgeç</Button>
            <Button variant="destructive" onClick={() => confirmAction?.onConfirm()} className="flex-1">Evet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExcelImportDialog open={showImport} onOpenChange={setShowImport} onSuccess={() => { fetchProducts(); setShowImport(false) }} />
    </div>
  )
}
