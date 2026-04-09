'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Plus, Search, Tag, KeyRound, Trash2, Pencil, DollarSign, ShoppingBag, AlertTriangle, FileSpreadsheet, FileText, UserCheck, Users2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'

export default function MusterilerPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showPriceDialog, setShowPriceDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '', shippingAddress: '', city: 'İstanbul', taxNumber: '', discountRate: '0', notes: '', salesRepId: '' })
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({})
  const [draftDiscounts, setDraftDiscounts] = useState<Record<string, string>>({})
  const [priceSearch, setPriceSearch] = useState('')
  const [passwordValue, setPasswordValue] = useState('')
  const [sameAddress, setSameAddress] = useState(false)
  const [editSameAddress, setEditSameAddress] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', shippingAddress: '', city: '', taxNumber: '', discountRate: '0', notes: '', salesRepId: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<{ customerId: string; name: string } | null>(null)
  const [exportDialog, setExportDialog] = useState<{ customerId: string; name: string } | null>(null)
  const [exportRange, setExportRange] = useState({ startDate: '', endDate: '' })
  const [exporting, setExporting] = useState(false)
  const { toast } = useToast()

  const fetchAll = () => {
    Promise.all([
      fetch('/api/musteriler').then(r => r.json()),
      fetch('/api/urunler').then(r => r.json()),
      session?.user?.role === 'ADMIN' ? fetch('/api/admin/ekip').then(r => r.json()) : Promise.resolve([]),
    ]).then(([c, p, s]) => { 
      setCustomers(Array.isArray(c) ? c : []) 
      setProducts(Array.isArray(p) ? p : []) 
      setStaff(Array.isArray(s) ? s : [])
      setLoading(false) 
    })
  }

  useEffect(() => { fetchAll() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/musteriler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, discountRate: parseFloat(form.discountRate) }),
    })
    if (res.ok) {
      toast({ title: 'Müşteri eklendi' })
      setShowAddDialog(false)
      setForm({ name: '', email: '', password: '', phone: '', address: '', shippingAddress: '', city: 'İstanbul', taxNumber: '', discountRate: '0', notes: '', salesRepId: '' })
      fetchAll()
    } else {
      const err = await res.json().catch(() => ({}))
      toast({ title: 'Hata', description: err.error || 'Müşteri eklenemedi', variant: 'destructive' })
    }
  }

  const handleResetPassword = async () => {
    if (!selectedCustomer || passwordValue.length < 4) return toast({ title: 'En az 4 karakter', variant: 'destructive' })
    const res = await fetch(`/api/musteriler/${selectedCustomer.id}/sifre`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordValue }),
    })
    if (res.ok) { toast({ title: 'Şifre güncellendi' }); setShowPasswordDialog(false); setPasswordValue('') }
    else toast({ title: 'Hata', variant: 'destructive' })
  }

  const handleEditCustomer = (c: any) => {
    setSelectedCustomer(c)
    setEditForm({
      name: c.user?.name || '',
      phone: c.phone || '',
      address: c.address || '',
      shippingAddress: c.shippingAddress || '',
      city: c.city || '',
      taxNumber: c.taxNumber || '',
      discountRate: c.discountRate?.toString() || '0',
      notes: c.notes || '',
      salesRepId: c.salesRepId || '',
    })
    // Shipping address address ile aynıysa veya boşsa checkbox isaretli gelsin
    setEditSameAddress(!c.shippingAddress || c.shippingAddress === c.address)
    setShowEditDialog(true)
  }

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch(`/api/musteriler/${selectedCustomer.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, isApproved: selectedCustomer.isApproved, discountRate: parseFloat(editForm.discountRate) }),
    })
    if (res.ok) { toast({ title: 'Müşteri güncellendi' }); setShowEditDialog(false); fetchAll() }
    else toast({ title: 'Hata', variant: 'destructive' })
  }

  const handleDeletePrice = async (productId: string) => {
    if (!selectedCustomer) return
    const res = await fetch(`/api/musteriler/${selectedCustomer.id}/fiyatlar`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    })
    if (res.ok) {
      toast({ title: 'Özel fiyat silindi' })
      setDraftPrices(prev => { const next = { ...prev }; delete next[productId]; return next })
      fetchAll()
    }
  }

  const handleSavePrice = async (productId: string) => {
    if (!selectedCustomer) return
    const price = parseFloat(draftPrices[productId])
    if (isNaN(price) || price <= 0) return toast({ title: 'Geçerli bir fiyat girin', variant: 'destructive' })
    const res = await fetch(`/api/musteriler/${selectedCustomer.id}/fiyatlar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, price }),
    })
    if (res.ok) { toast({ title: 'Özel fiyat kaydedildi' }); fetchAll() }
    else toast({ title: 'Hata', variant: 'destructive' })
  }

  const handleDeleteCustomer = (customerId: string, name: string) => {
    setDeleteConfirm({ customerId, name })
  }

  const handleExportExcel = async () => {
    if (!exportDialog) return
    setExporting(true)
    try {
      const params = new URLSearchParams({ customerId: exportDialog.customerId })
      if (exportRange.startDate) params.set('startDate', exportRange.startDate)
      if (exportRange.endDate) params.set('endDate', exportRange.endDate)
      const orders = await fetch(`/api/siparisler?${params}`).then(r => r.json())
      const XLSX = await import('xlsx')
      const rows: any[] = []
      const STATUS_MAP: Record<string, string> = { HAZIRLANIYOR: 'Hazırlanıyor', KARGOYA_VERILDI: 'Kargoya Verildi', TESLIM_EDILDI: 'Teslim Edildi', IPTAL: 'İptal' }
      for (const order of orders) {
        const paidAmount = order.payments?.filter((p: any) => p.status === 'ODENDI').reduce((s: number, p: any) => s + p.amount, 0) || 0
        for (const item of order.orderItems || []) {
          rows.push({
            'Sipariş Tarihi': new Date(order.createdAt).toLocaleDateString('tr-TR'),
            'Sipariş No': order.orderNumber || order.id.slice(-8).toUpperCase(),
            'Ürün Adı': item.product?.name || '',
            'Kategori': item.product?.category || '',
            'Adet': item.quantity,
            'Birim': item.product?.unit || 'Adet',
            'Birim Fiyat': item.unitPrice,
            'Toplam': item.total,
            'Sipariş Toplamı': order.totalAmount,
            'Ödenen': paidAmount,
            'Kalan Borç': order.totalAmount - paidAmount,
            'Durum': STATUS_MAP[order.status] || order.status,
            'Not': order.notes || '',
          })
        }
      }
      if (rows.length === 0) {
        toast({ title: 'Bu aralıkta sipariş bulunamadı', variant: 'destructive' })
        setExporting(false)
        return
      }
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Siparişler')
      const safeName = exportDialog.name.replace(/[^a-zA-Z0-9çşıöüğÇŞİÖÜĞ ]/g, '')
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeName}-siparisler.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setExportDialog(null)
      setExportRange({ startDate: '', endDate: '' })
    } catch {
      toast({ title: 'Export hatası', variant: 'destructive' })
    }
    setExporting(false)
  }

  const confirmDeleteCustomer = async () => {
    if (!deleteConfirm) return
    const res = await fetch(`/api/musteriler/${deleteConfirm.customerId}`, { method: 'DELETE' })
    if (res.ok) { toast({ title: 'Müşteri pasife alındı' }); fetchAll() }
    else { toast({ title: 'Hata', variant: 'destructive' }) }
    setDeleteConfirm(null)
  }

  const handlePriceChange = (productId: string, salePrice: number, value: string) => {
    setDraftPrices(prev => ({ ...prev, [productId]: value }))
    const price = parseFloat(value)
    if (!isNaN(price) && price > 0 && salePrice > 0) {
      const disc = ((salePrice - price) / salePrice) * 100
      setDraftDiscounts(prev => ({ ...prev, [productId]: disc.toFixed(1) }))
    } else {
      setDraftDiscounts(prev => ({ ...prev, [productId]: '' }))
    }
  }

  const handleDiscountChange = (productId: string, salePrice: number, value: string) => {
    setDraftDiscounts(prev => ({ ...prev, [productId]: value }))
    const disc = parseFloat(value)
    if (!isNaN(disc) && salePrice > 0) {
      const price = salePrice * (1 - disc / 100)
      setDraftPrices(prev => ({ ...prev, [productId]: price.toFixed(2) }))
    } else {
      setDraftPrices(prev => ({ ...prev, [productId]: '' }))
    }
  }

  const handleOpenPricing = (c: any) => {
    setSelectedCustomer(c)
    setPriceSearch('')
    const prices: Record<string, string> = {}
    const discounts: Record<string, string> = {}
    for (const cp of c.customerPrices || []) {
      prices[cp.productId] = cp.price.toString()
      const product = products.find((pr: any) => pr.id === cp.productId)
      if (product && product.salePrice > 0) {
        const disc = ((product.salePrice - cp.price) / product.salePrice) * 100
        discounts[cp.productId] = disc.toFixed(1)
      }
    }
    setDraftPrices(prices)
    setDraftDiscounts(discounts)
    setShowPriceDialog(true)
  }

  const filtered = customers.filter((c: any) => {
    const searchMatch = 
      c.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.user?.email?.toLowerCase().includes(search.toLowerCase())
    return searchMatch
  })

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Müşteriler</h1>
            <p className="text-gray-500 text-sm">{customers.length} müşteri kayıtlı</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
,StartLine:268,TargetContent:          <Button onClick={() => setShowAddDialog(true)}><Plus className="mr-2 h-4 w-4" />Yeni Müşteri</Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input className="pl-9" placeholder="Müşteri ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-500 text-sm">Müşteri bulunamadı</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Müşteri / Plasiyer</TableHead>
                <TableHead className="hidden md:table-cell">İletişim</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Sipariş</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Ciro</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Borç</TableHead>
                <TableHead className="text-right">Genel İndirim</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => {
                const totalCiro = c.orders?.reduce((sum: number, o: any) => sum + o.totalAmount, 0) || 0
                const totalPending = c.orders?.reduce((sum: number, o: any) => sum + (o.payments?.filter((p: any) => p.status === 'BEKLIYOR' || p.status === 'GECIKTI').reduce((s: number, p: any) => s + p.amount, 0) || 0), 0) || 0
                const specialPriceCount = c.customerPrices?.length || 0
                return (
                  <TableRow key={c.id} className={!c.isApproved ? 'bg-orange-50/50' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-medium flex items-center gap-1.5">
                          {c.user?.name}
                          {c.salesRep && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full border border-gray-200" title={`Sorumlu: ${c.salesRep.name}`}>
                              {c.salesRep.name}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 md:hidden">{c.user?.email}</p>
                        <div className="flex gap-2 mt-1 lg:hidden">
                          <span className="text-xs text-gray-500">{c.orders?.length || 0} sip.</span>
                          <span className="text-xs font-semibold text-green-600">{formatCurrency(totalCiro)}</span>
                          {totalPending > 0 && <span className="text-xs text-red-500">{formatCurrency(totalPending)}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">
                        <p className="text-gray-600">{c.phone || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right">
                      <span className="font-medium">{c.orders?.length || 0}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right">
                      <span className="font-semibold text-green-600">{formatCurrency(totalCiro)}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right">
                      {totalPending > 0 ? (
                        <span className="font-semibold text-red-500">{formatCurrency(totalPending)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-medium text-blue-600">%{c.discountRate}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <>
                            <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600 border-blue-100 hover:bg-blue-50" onClick={() => handleOpenPricing(c)} title="Özel Fiyatlar">
                              <DollarSign className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8 text-gray-600 border-gray-100 hover:bg-gray-50" onClick={() => handleEditCustomer(c)} title="Düzenle">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8 text-orange-600 border-orange-100 hover:bg-orange-50" onClick={() => setExportDialog({ customerId: c.id, name: c.user?.name || '' })} title="Excel Aktar">
                              <FileSpreadsheet className="h-4 w-4" />
                            </Button>
                        
                        </>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Müşteri Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ad Soyad *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>E-posta *</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Şifre</Label>
                <Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Telefon *</Label>
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-20">
                    <div className="h-10 px-3 flex items-center justify-center bg-gray-100 border rounded-md text-sm font-medium text-gray-700">
                      +90
                    </div>
                  </div>
                  <Input
                    placeholder="XXX-XXX-XX-XX"
                    value={form.phone}
                    onChange={e => {
                      const input = e.target
                      const start = input.selectionStart || 0
                      let v = input.value.replace(/\D/g, '').slice(0, 10)
                      
                      // Eski değeri ve pozisyonu kaydet ki tire eklendiğinde imleci kaydıralım
                      const oldLen = form.phone.length
                      
                      if (v.length > 7) v = v.slice(0, 3) + '-' + v.slice(3, 6) + '-' + v.slice(6, 8) + '-' + v.slice(8)
                      else if (v.length > 6) v = v.slice(0, 3) + '-' + v.slice(3, 6) + '-' + v.slice(6)
                      else if (v.length > 3) v = v.slice(0, 3) + '-' + v.slice(3)
                      
                      setForm({...form, phone: v})
                      
                      // İmleci koru (tirelerin eklenip silinmesini hesaba katarak)
                      setTimeout(() => {
                        const newLen = v.length
                        const diff = newLen - oldLen
                        input.setSelectionRange(start + (diff > 0 ? diff : 0), start + (diff > 0 ? diff : 0))
                      }, 0)
                    }}
                    required
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-400">Başta 0 yazmayın</p>
              </div>
              <div className="space-y-2">
                <Label>Fatura Adresi</Label>
                <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Şehir</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.city}
                  onChange={e => setForm({...form, city: e.target.value})}
                >
                  <option value="">Şehir seçin...</option>
                  <option value="İstanbul">İstanbul</option>
                  <option value="Adana">Adana</option>
                  <option value="Adıyaman">Adıyaman</option>
                  <option value="Afyonkarahisar">Afyonkarahisar</option>
                  <option value="Ağrı">Ağrı</option>
                  <option value="Amasya">Amasya</option>
                  <option value="Ankara">Ankara</option>
                  <option value="Antalya">Antalya</option>
                  <option value="Artvin">Artvin</option>
                  <option value="Aydın">Aydın</option>
                  <option value="Balıkesir">Balıkesir</option>
                  <option value="Bilecik">Bilecik</option>
                  <option value="Bingöl">Bingöl</option>
                  <option value="Bitlis">Bitlis</option>
                  <option value="Bolu">Bolu</option>
                  <option value="Burdur">Burdur</option>
                  <option value="Bursa">Bursa</option>
                  <option value="Çanakkale">Çanakkale</option>
                  <option value="Çankırı">Çankırı</option>
                  <option value="Çorum">Çorum</option>
                  <option value="Denizli">Denizli</option>
                  <option value="Diyarbakır">Diyarbakır</option>
                  <option value="Edirne">Edirne</option>
                  <option value="Elazığ">Elazığ</option>
                  <option value="Erzincan">Erzincan</option>
                  <option value="Erzurum">Erzurum</option>
                  <option value="Eskişehir">Eskişehir</option>
                  <option value="Gaziantep">Gaziantep</option>
                  <option value="Giresun">Giresun</option>
                  <option value="Gümüşhane">Gümüşhane</option>
                  <option value="Hakkari">Hakkari</option>
                  <option value="Hatay">Hatay</option>
                  <option value="Isparta">Isparta</option>
                  <option value="Mersin">Mersin</option>
                  <option value="İzmir">İzmir</option>
                  <option value="Kars">Kars</option>
                  <option value="Kastamonu">Kastamonu</option>
                  <option value="Kayseri">Kayseri</option>
                  <option value="Kırklareli">Kırklareli</option>
                  <option value="Kırşehir">Kırşehir</option>
                  <option value="Kocaeli">Kocaeli</option>
                  <option value="Konya">Konya</option>
                  <option value="Kütahya">Kütahya</option>
                  <option value="Malatya">Malatya</option>
                  <option value="Manisa">Manisa</option>
                  <option value="Kahramanmaraş">Kahramanmaraş</option>
                  <option value="Mardin">Mardin</option>
                  <option value="Muğla">Muğla</option>
                  <option value="Muş">Muş</option>
                  <option value="Nevşehir">Nevşehir</option>
                  <option value="Niğde">Niğde</option>
                  <option value="Ordu">Ordu</option>
                  <option value="Rize">Rize</option>
                  <option value="Sakarya">Sakarya</option>
                  <option value="Samsun">Samsun</option>
                  <option value="Siirt">Siirt</option>
                  <option value="Sinop">Sinop</option>
                  <option value="Sivas">Sivas</option>
                  <option value="Tekirdağ">Tekirdağ</option>
                  <option value="Tokat">Tokat</option>
                  <option value="Trabzon">Trabzon</option>
                  <option value="Tunceli">Tunceli</option>
                  <option value="Şanlıurfa">Şanlıurfa</option>
                  <option value="Uşak">Uşak</option>
                  <option value="Van">Van</option>
                  <option value="Yozgat">Yozgat</option>
                  <option value="Zonguldak">Zonguldak</option>
                  <option value="Aksaray">Aksaray</option>
                  <option value="Bayburt">Bayburt</option>
                  <option value="Karaman">Karaman</option>
                  <option value="Kırıkkale">Kırıkkale</option>
                  <option value="Batman">Batman</option>
                  <option value="Şırnak">Şırnak</option>
                  <option value="Bartın">Bartın</option>
                  <option value="Ardahan">Ardahan</option>
                  <option value="Iğdır">Iğdır</option>
                  <option value="Yalova">Yalova</option>
                  <option value="Karabük">Karabük</option>
                  <option value="Kilis">Kilis</option>
                  <option value="Osmaniye">Osmaniye</option>
                  <option value="Düzce">Düzce</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>TC Kimlik No / Vergi No</Label>
                <Input
                  placeholder="10 veya 11 haneli numara"
                  value={form.taxNumber}
                  onChange={e => setForm({...form, taxNumber: e.target.value.replace(/\D/g, '').slice(0, 11)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Genel İndirim (%)</Label>
                <Input type="number" min="0" max="100" step="0.1" value={form.discountRate} onChange={e => setForm({...form, discountRate: e.target.value})} />
              </div>
              <div className="col-span-1 sm:col-span-2 flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="sameAddress"
                  checked={sameAddress}
                  onChange={(e) => {
                    setSameAddress(e.target.checked)
                    if (e.target.checked) {
                      setForm({...form, shippingAddress: form.address})
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="sameAddress" className="text-sm text-gray-700">Teslimat adresi fatura adresiyle aynı</label>
              </div>
              {!sameAddress && (
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <Label>Teslimat Adresi</Label>
                  <Input
                    value={form.shippingAddress}
                    onChange={e => setForm({...form, shippingAddress: e.target.value})}
                    placeholder="Farklı teslimat adresi varsa girin"
                  />
                </div>
              )}
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label>Notlar</Label>
                <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>

              {session?.user?.role === 'ADMIN' && (
                <div className="col-span-1 sm:col-span-2 space-y-2 pt-2 border-t">
                  <Label className="text-xs text-gray-500 uppercase tracking-wider">Sorumlu Plasiyer Atama</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    value={form.salesRepId}
                    onChange={e => setForm({...form, salesRepId: e.target.value})}
                  >
                    <option value="">Plasiyer seçin (Boş bırakılırsa atanmaz)</option>
                    {staff.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400">Bu müşteri sadece atanan plasiyerin ekranında görünecektir.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>İptal</Button>
              <Button type="submit">Ekle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Müşteri Düzenle - {selectedCustomer?.user?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCustomer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ad Soyad</Label>
                <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-20">
                    <div className="h-10 px-3 flex items-center justify-center bg-gray-100 border rounded-md text-sm font-medium text-gray-700">
                      +90
                    </div>
                  </div>
                  <Input
                    placeholder="XXX-XXX-XX-XX"
                    value={editForm.phone}
                    onChange={e => {
                      const input = e.target
                      const start = input.selectionStart || 0
                      let v = input.value.replace(/\D/g, '').slice(0, 10)
                      
                      const oldLen = editForm.phone.length
                      
                      if (v.length > 7) v = v.slice(0, 3) + '-' + v.slice(3, 6) + '-' + v.slice(6, 8) + '-' + v.slice(8)
                      else if (v.length > 6) v = v.slice(0, 3) + '-' + v.slice(3, 6) + '-' + v.slice(6)
                      else if (v.length > 3) v = v.slice(0, 3) + '-' + v.slice(3)
                      
                      setEditForm({...editForm, phone: v})
                      
                      setTimeout(() => {
                        const newLen = v.length
                        const diff = newLen - oldLen
                        input.setSelectionRange(start + (diff > 0 ? diff : 0), start + (diff > 0 ? diff : 0))
                      }, 0)
                    }}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-400">Başta 0 yazmayın</p>
              </div>
              <div className="space-y-2">
                <Label>Fatura Adresi</Label>
                <Input 
                  value={editForm.address} 
                  onChange={e => {
                    const newAddress = e.target.value
                    setEditForm({...editForm, address: newAddress, shippingAddress: editSameAddress ? newAddress : editForm.shippingAddress})
                  }} 
                />
              </div>
              <div className="space-y-2">
                <Label>Şehir</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editForm.city}
                  onChange={e => setEditForm({...editForm, city: e.target.value})}
                >
                  <option value="">Şehir seçin...</option>
                  <option value="İstanbul">İstanbul</option>
                  <option value="Adana">Adana</option>
                  <option value="Adıyaman">Adıyaman</option>
                  <option value="Afyonkarahisar">Afyonkarahisar</option>
                  <option value="Ağrı">Ağrı</option>
                  <option value="Amasya">Amasya</option>
                  <option value="Ankara">Ankara</option>
                  <option value="Antalya">Antalya</option>
                  <option value="Artvin">Artvin</option>
                  <option value="Aydın">Aydın</option>
                  <option value="Balıkesir">Balıkesir</option>
                  <option value="Bilecik">Bilecik</option>
                  <option value="Bingöl">Bingöl</option>
                  <option value="Bitlis">Bitlis</option>
                  <option value="Bolu">Bolu</option>
                  <option value="Burdur">Burdur</option>
                  <option value="Bursa">Bursa</option>
                  <option value="Çanakkale">Çanakkale</option>
                  <option value="Çankırı">Çankırı</option>
                  <option value="Çorum">Çorum</option>
                  <option value="Denizli">Denizli</option>
                  <option value="Diyarbakır">Diyarbakır</option>
                  <option value="Edirne">Edirne</option>
                  <option value="Elazığ">Elazığ</option>
                  <option value="Erzincan">Erzincan</option>
                  <option value="Erzurum">Erzurum</option>
                  <option value="Eskişehir">Eskişehir</option>
                  <option value="Gaziantep">Gaziantep</option>
                  <option value="Giresun">Giresun</option>
                  <option value="Gümüşhane">Gümüşhane</option>
                  <option value="Hakkari">Hakkari</option>
                  <option value="Hatay">Hatay</option>
                  <option value="Isparta">Isparta</option>
                  <option value="Mersin">Mersin</option>
                  <option value="İzmir">İzmir</option>
                  <option value="Kars">Kars</option>
                  <option value="Kastamonu">Kastamonu</option>
                  <option value="Kayseri">Kayseri</option>
                  <option value="Kırklareli">Kırklareli</option>
                  <option value="Kırşehir">Kırşehir</option>
                  <option value="Kocaeli">Kocaeli</option>
                  <option value="Konya">Konya</option>
                  <option value="Kütahya">Kütahya</option>
                  <option value="Malatya">Malatya</option>
                  <option value="Manisa">Manisa</option>
                  <option value="Kahramanmaraş">Kahramanmaraş</option>
                  <option value="Mardin">Mardin</option>
                  <option value="Muğla">Muğla</option>
                  <option value="Muş">Muş</option>
                  <option value="Nevşehir">Nevşehir</option>
                  <option value="Niğde">Niğde</option>
                  <option value="Ordu">Ordu</option>
                  <option value="Rize">Rize</option>
                  <option value="Sakarya">Sakarya</option>
                  <option value="Samsun">Samsun</option>
                  <option value="Siirt">Siirt</option>
                  <option value="Sinop">Sinop</option>
                  <option value="Sivas">Sivas</option>
                  <option value="Tekirdağ">Tekirdağ</option>
                  <option value="Tokat">Tokat</option>
                  <option value="Trabzon">Trabzon</option>
                  <option value="Tunceli">Tunceli</option>
                  <option value="Şanlıurfa">Şanlıurfa</option>
                  <option value="Uşak">Uşak</option>
                  <option value="Van">Van</option>
                  <option value="Yozgat">Yozgat</option>
                  <option value="Zonguldak">Zonguldak</option>
                  <option value="Aksaray">Aksaray</option>
                  <option value="Bayburt">Bayburt</option>
                  <option value="Karaman">Karaman</option>
                  <option value="Kırıkkale">Kırıkkale</option>
                  <option value="Batman">Batman</option>
                  <option value="Şırnak">Şırnak</option>
                  <option value="Bartın">Bartın</option>
                  <option value="Ardahan">Ardahan</option>
                  <option value="Iğdır">Iğdır</option>
                  <option value="Yalova">Yalova</option>
                  <option value="Karabük">Karabük</option>
                  <option value="Kilis">Kilis</option>
                  <option value="Osmaniye">Osmaniye</option>
                  <option value="Düzce">Düzce</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>TC Kimlik No / Vergi No</Label>
                <Input
                  placeholder="10 veya 11 haneli numara"
                  value={editForm.taxNumber}
                  onChange={e => setEditForm({...editForm, taxNumber: e.target.value.replace(/\D/g, '').slice(0, 11)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Genel İndirim (%)</Label>
                <Input type="number" min="0" max="100" step="0.1" value={editForm.discountRate} onChange={e => setEditForm({...editForm, discountRate: e.target.value})} />
              </div>
              <div className="col-span-1 sm:col-span-2 flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="editSameAddress"
                  checked={editSameAddress}
                  onChange={(e) => {
                    setEditSameAddress(e.target.checked)
                    if (e.target.checked) {
                      setEditForm({...editForm, shippingAddress: editForm.address})
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="editSameAddress" className="text-sm text-gray-700">Teslimat adresi fatura adresiyle aynı</label>
              </div>
              {!editSameAddress && (
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <Label>Teslimat Adresi</Label>
                  <Input
                    value={editForm.shippingAddress}
                    onChange={e => setEditForm({...editForm, shippingAddress: e.target.value})}
                    placeholder="Farklı teslimat adresi varsa girin"
                  />
                </div>
              )}
              <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label>Notlar</Label>
                <Input value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} />
              </div>

              {session?.user?.role === 'ADMIN' && (
                <div className="col-span-1 sm:col-span-2 space-y-2 py-2 border-t">
                  <Label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Sorumlu Plasiyer</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all hover:border-blue-300"
                    value={editForm.salesRepId}
                    onChange={e => setEditForm({...editForm, salesRepId: e.target.value})}
                  >
                    <option value="">Plasiyer seçin (Boş bırakılırsa yetkisiz kalır)</option>
                    {staff.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Diğer İşlemler</h4>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => { setShowEditDialog(false); setShowPasswordDialog(true) }}
                  className="gap-2"
                >
                  <KeyRound className="h-4 w-4" />
                  Şifre Sıfırla
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => { 
                    setShowEditDialog(false)
                    handleDeleteCustomer(selectedCustomer?.id, selectedCustomer?.user?.name || '')
                  }}
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Müşteriyi Pasife Al
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>İptal</Button>
              <Button type="submit">Bilgileri Güncelle</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şifre Sıfırla - {selectedCustomer?.user?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Yeni Şifre (min. 4 karakter)</Label>
              <Input
                type="password"
                value={passwordValue}
                onChange={e => setPasswordValue(e.target.value)}
                placeholder="Yeni şifre girin"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPasswordDialog(false); setPasswordValue('') }}>İptal</Button>
            <Button onClick={handleResetPassword}>Şifreyi Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Special Pricing Dialog */}
      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Özel Fiyatlar - {selectedCustomer?.user?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input className="pl-9" placeholder="Ürün ara..." value={priceSearch} onChange={e => setPriceSearch(e.target.value)} />
            </div>
            <div className="border rounded-lg overflow-y-auto flex-1">
              <Table>
                <TableHeader className="sticky top-0 bg-white">
                  <TableRow>
                    <TableHead>Ürün</TableHead>
                    <TableHead className="text-right">Liste Fiyatı</TableHead>
                    <TableHead className="text-right">Özel Fiyat</TableHead>
                    <TableHead className="text-right">İndirim %</TableHead>
                    <TableHead className="text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products
                    .filter((p: any) => !priceSearch || p.name.toLowerCase().includes(priceSearch.toLowerCase()))
                    .map((p: any) => {
                      const savedCp = selectedCustomer?.customerPrices?.find((cp: any) => cp.productId === p.id)
                      const savedPrice: number | undefined = savedCp?.price
                      const draft = draftPrices[p.id] ?? ''
                      const draftDisc = draftDiscounts[p.id] ?? ''
                      const isDirty = draft !== (savedPrice?.toString() ?? '')
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-right text-gray-600">{formatCurrency(p.salePrice)}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="₺"
                              className="w-28 h-8 text-sm text-right"
                              value={draft}
                              onChange={e => handlePriceChange(p.id, p.salePrice, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (isDirty && draft) handleSavePrice(p.id);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setDraftPrices(prev => ({ ...prev, [p.id]: savedPrice?.toString() ?? '' }));
                                  setDraftDiscounts(prev => ({ ...prev, [p.id]: '' }));
                                  if (savedPrice && p.salePrice > 0) {
                                    const disc = ((p.salePrice - savedPrice) / p.salePrice) * 100;
                                    setDraftDiscounts(prev => ({ ...prev, [p.id]: disc.toFixed(1) }));
                                  }
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              placeholder="%"
                              className="w-20 h-8 text-sm text-right"
                              value={draftDisc}
                              onChange={e => handleDiscountChange(p.id, p.salePrice, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (isDirty && draft) handleSavePrice(p.id);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setDraftPrices(prev => ({ ...prev, [p.id]: savedPrice?.toString() ?? '' }));
                                  setDraftDiscounts(prev => ({ ...prev, [p.id]: '' }));
                                  if (savedPrice && p.salePrice > 0) {
                                    const disc = ((p.salePrice - savedPrice) / p.salePrice) * 100;
                                    setDraftDiscounts(prev => ({ ...prev, [p.id]: disc.toFixed(1) }));
                                  }
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isDirty && draft ? (
                                <Button size="sm" className="h-8" onClick={() => handleSavePrice(p.id)}>Kaydet</Button>
                              ) : savedPrice !== undefined ? (
                                <Button size="sm" variant="ghost" onClick={() => handleDeletePrice(p.id)} className="text-red-500 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  }
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriceDialog(false)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel Export Dialog */}
      <Dialog open={!!exportDialog} onOpenChange={() => setExportDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="bg-green-100 p-2 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
              </div>
              Sipariş Dökümü — {exportDialog?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-500">Tarih aralığı boş bırakılırsa tüm geçmiş siparişler indirilir.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Başlangıç Tarihi</Label>
                <Input
                  type="date"
                  value={exportRange.startDate}
                  onChange={e => setExportRange(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bitiş Tarihi</Label>
                <Input
                  type="date"
                  value={exportRange.endDate}
                  onChange={e => setExportRange(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
              <p><span className="font-semibold">İçerik:</span> Sipariş tarihi, ürün adı, adet, birim fiyat, toplam, durum, ödeme bilgisi</p>
              <p><span className="font-semibold">Format:</span> Excel (.xlsx) — KDV Hariç fiyatlar</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExportDialog(null)} className="flex-1">Vazgeç</Button>
            <Button
              onClick={handleExportExcel}
              disabled={exporting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {exporting ? 'İndiriliyor...' : 'Excel İndir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              Müşteriyi Pasife Al
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            <span className="font-semibold">"{deleteConfirm?.name}"</span> müşterisini pasife almak istediğinize emin misiniz? Müşteri sisteme giriş yapamaz hale gelecektir.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Vazgeç</Button>
            <Button variant="destructive" onClick={confirmDeleteCustomer} className="flex-1">Evet, Pasife Al</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
