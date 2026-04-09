'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Plus, ShoppingCart, Search, ChevronDown, ChevronUp, RefreshCw, CreditCard, Printer, Package, FileSpreadsheet } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency, formatDate, ORDER_STATUS, ORDER_STATUS_COLOR, PAYMENT_METHOD, PAYMENT_STATUS_COLOR } from '@/lib/utils'

export default function SiparislerPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('TUMU')
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [items, setItems] = useState<{ productId: string; quantity: number; unitPrice: number }[]>([])
  const [notes, setNotes] = useState('')
  const [paymentForm, setPaymentForm] = useState({ orderId: '', amount: '', method: 'NAKIT', dueDate: '' })
  const [showPayment, setShowPayment] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [editNotes, setEditNotes] = useState<{ id: string; value: string } | null>(null)
  const [editDate, setEditDate] = useState<{ id: string; value: string } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ orderId: string; status: string; orderNumber?: string; reminderAt?: string; reminderNote?: string } | null>(null)
  const [kargoDialog, setKargoDialog] = useState<{ orderId: string; cargoCompany: string; trackingNumber: string } | null>(null)
  const { toast } = useToast()

  const fetchAll = () => {
    Promise.all([
      fetch('/api/siparisler').then(r => r.json()),
      fetch('/api/musteriler').then(r => r.json()),
      fetch('/api/urunler').then(r => r.json()),
    ]).then(([o, c, p]) => { setOrders(o); setCustomers(c); setProducts(p); setLoading(false) })
  }

  useEffect(() => { fetchAll() }, [])

  const getCustomerPrice = (productId: string) => {
    const customer = customers.find((c: any) => c.id === selectedCustomer)
    if (!customer) return null
    const cp = customer.customerPrices?.find((p: any) => p.productId === productId)
    if (cp) return cp.price
    const product = products.find((p: any) => p.id === productId)
    if (!product) return null
    if (customer.discountRate > 0) return product.salePrice * (1 - customer.discountRate / 100)
    return product.salePrice
  }

  const addItem = (productId: string) => {
    if (!productId) return
    const price = getCustomerPrice(productId) || products.find((p: any) => p.id === productId)?.salePrice || 0
    setItems(prev => {
      const existing = prev.find(i => i.productId === productId)
      if (existing) return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { productId, quantity: 1, unitPrice: price }]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer || items.length === 0) return toast({ title: 'Müşteri ve ürün seçin', variant: 'destructive' })
    const res = await fetch('/api/siparisler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: selectedCustomer, items, notes }),
    })
    if (res.ok) {
      toast({ title: 'Sipariş oluşturuldu' })
      setShowForm(false); setSelectedCustomer(''); setItems([]); setNotes(''); setProductSearch('')
      fetchAll()
    } else {
      const err = await res.json().catch(() => ({}))
      toast({ title: 'Sipariş oluşturulamadı', description: err.error || 'Bir hata oluştu', variant: 'destructive' })
    }
  }

  const openConfirmDialog = (orderId: string, status: string) => {
    const order = orders.find(o => o.id === orderId)
    setConfirmDialog({ orderId, status, orderNumber: order?.customer?.user?.name })
  }

  const updateStatus = async () => {
    if (!confirmDialog) return
    const res = await fetch(`/api/siparisler/${confirmDialog.orderId}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        status: confirmDialog.status,
        reminderAt: confirmDialog.reminderAt ? new Date(confirmDialog.reminderAt).toISOString() : null,
        reminderNote: confirmDialog.reminderNote || null
      }) 
    })
    if (res.ok) {
      toast({ title: confirmDialog.status === 'TESLIM_EDILDI' ? 'Sipariş teslim edildi' : 'Sipariş iptal edildi' })
    } else {
      toast({ title: 'Hata', description: 'İşlem gerçekleştirilemedi', variant: 'destructive' })
    }
    setConfirmDialog(null)
    fetchAll()
  }

  const saveKargo = async () => {
    if (!kargoDialog) return
    const res = await fetch(`/api/siparisler/${kargoDialog.orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'KARGOYA_VERILDI', cargoCompany: kargoDialog.cargoCompany, trackingNumber: kargoDialog.trackingNumber }),
    })
    if (res.ok) {
      toast({ title: 'Kargoya verildi olarak işaretlendi' })
    } else {
      toast({ title: 'Hata', description: 'İşlem gerçekleştirilemedi', variant: 'destructive' })
    }
    setKargoDialog(null)
    fetchAll()
  }

  const handlePayment = async () => {
    const res = await fetch('/api/tahsilat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: paymentForm.orderId, amount: parseFloat(paymentForm.amount), method: paymentForm.method, dueDate: paymentForm.dueDate || null }),
    })
    if (res.ok) {
      toast({ title: 'Tahsilat kaydedildi' })
      setShowPayment(null); setPaymentForm({ orderId: '', amount: '', method: 'NAKIT', dueDate: '' })
      fetchAll()
    }
  }

  const saveNotes = async (orderId: string, notesValue: string) => {
    await fetch(`/api/siparisler/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notesValue }),
    })
    setEditNotes(null)
    fetchAll()
  }

  const saveDate = async (orderId: string, dateValue: string) => {
    await fetch(`/api/siparisler/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderDate: new Date(dateValue).toISOString() }),
    })
    setEditDate(null)
    fetchAll()
  }

  const repeatOrder = async (order: any) => {
    const outOfStock = order.orderItems.filter((i: any) => {
      const p = products.find((pr: any) => pr.id === i.productId)
      return !p || p.stock < i.quantity
    })
    if (outOfStock.length > 0) {
      const names = outOfStock.map((i: any) => {
        const p = products.find((pr: any) => pr.id === i.productId)
        return p ? `${p.name} (stok: ${p.stock}, gerekli: ${i.quantity})` : 'Bilinmeyen ürün'
      }).join(', ')
      return toast({ title: 'Yetersiz stok', description: names, variant: 'destructive' })
    }
    const res = await fetch('/api/siparisler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: order.customerId, items: order.orderItems.map((i: any) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })), notes: 'Tekrar sipariş' }),
    })
    if (res.ok) { toast({ title: 'Tekrar sipariş oluşturuldu' }); fetchAll() }
    else {
      const err = await res.json().catch(() => ({}))
      toast({ title: 'Sipariş oluşturulamadı', description: err.error || 'Bir hata oluştu', variant: 'destructive' })
    }
  }

  const filtered = orders.filter((o: any) => {
    const nameMatch = o.customer?.user?.name?.toLowerCase().includes(search.toLowerCase())
    const statusMatch = statusFilter === 'TUMU' || o.status === statusFilter
    return nameMatch && statusMatch
  })

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Siparişler</h1>
          <p className="text-gray-500 text-sm">
            {filtered.length !== orders.length ? `${filtered.length} / ${orders.length} sipariş` : `${orders.length} sipariş`}
            {filtered.length > 0 && ` • ${formatCurrency(filtered.reduce((s: number, o: any) => s + o.totalAmount, 0))}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { 
            const w = window.open('', '_blank'); 
            if (!w) return; 
            const hazirlaniyor = filtered.filter((o: any) => o.status === 'HAZIRLANIYOR'); 
            let html = ''; 
            hazirlaniyor.forEach((o: any) => { 
              const items = o.orderItems?.map((i: any) => `
                <div style='display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #f1f5f9;font-size:9px'>
                  <span style='flex:1;color:#334155'><b style='color:#64748b;font-family:monospace;margin-right:4px'>${i.product?.code || ''}</b>${i.product?.name}</span>
                  <span style='font-weight:900;margin-left:8px'>x${i.quantity}</span>
                </div>
              `).join('') || ''; 
              html += `
                <div style='border:1px solid #e2e8f0;border-radius:8px;padding:10px;page-break-inside:avoid;background:#fff'>
                   <div style='display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;border-bottom:1.5px solid #f8fafc;padding-bottom:6px'>
                      <div>
                        <div style='font-size:11px;font-weight:900;color:#0f172a'>${o.customer?.user?.name || ''}</div>
                        <div style='font-size:8px;color:#94a3b8;margin-top:1px'>${o.orderNumber || o.id.slice(-8).toUpperCase()}</div>
                      </div>
                      <div style='text-align:right'>
                        <div style='font-size:11px;font-weight:900;color:#2563eb'>${o.totalAmount.toLocaleString('tr-TR', {style:'currency',currency:'TRY',minimumFractionDigits:0})}</div>
                      </div>
                   </div>
                   <div style='margin-bottom:8px'>${items}</div>
                   <div style='display:flex;justify-content:flex-end;align-items:center;gap:6px;font-size:8px;color:#94a3b8;font-weight:bold'>
                      OK <div style='width:12px;height:12px;border:1.5px solid #e2e8f0;border-radius:3px'></div>
                   </div>
                </div>`; 
            }); 
            const total = hazirlaniyor.reduce((s: number, o: any) => s + o.totalAmount, 0); 
            w.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset='utf-8'>
                <title>Sevkiyat Listesi</title>
                <style>
                  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                  body { font-family: 'Inter', sans-serif; padding: 20px; margin: 0; color: #1e293b; background: #fff; }
                  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
                  .header h2 { margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
                  .meta { display: flex; justify-content: center; gap: 15px; margin-top: 6px; font-size: 11px; font-weight: 700; color: #64748b; }
                  .sum-box { color: #0f172a; border: 1px solid #e2e8f0; padding: 1px 8px; border-radius: 99px; }
                  .grid-container { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                  @media print { 
                    body { padding: 0; }
                    .no-print { display: none !important; }
                    @page { margin: 10mm; }
                  }
                </style>
              </head>
              <body>
                <div class='header'>
                  <h2>Hazırlanan Siparişler</h2>
                  <div class='meta'>
                    <span>TARİH: ${new Date().toLocaleDateString('tr-TR')}</span>
                    <span>ADET: ${hazirlaniyor.length}</span>
                    <span class='sum-box'>TOPLAM: ${total.toLocaleString('tr-TR', {style:'currency',currency:'TRY',minimumFractionDigits:0})}</span>
                  </div>
                </div>
                <div class='grid-container'>${html}</div>
                <div class='no-print' style='margin-top:30px; text-align:center'>
                  <button onclick='window.print()' style='background:#0f172a; color:white; border:none; padding:12px 30px; border-radius:8px; font-weight:900; font-size:14px; cursor:pointer'>🖨️ Yazdır</button>
                </div>
              </body>
              </html>
            `); 
            w.document.close(); 
          }} title="Hazırlanan siparişleri yazdır"><Printer className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => { const csv = filtered.map((o: any) => { const items = o.orderItems?.map((i: any) => `${i.product?.code || ''}-${i.product?.name}(${i.quantity})`).join(', '); return `${o.orderNumber || o.id.slice(-8).toUpperCase()},${o.customer?.user?.name || ''},${new Date(o.createdAt).toLocaleDateString('tr-TR')},"${items}",${o.totalAmount},${o.status === 'TESLIM_EDILDI' ? 'Teslim Edildi' : o.status === 'IPTAL' ? 'İptal' : 'Hazırlanıyor'}`; }).join('\n'); const header = 'Sipariş No,Müşteri,Tarih,Ürünler,Tutar,Durum\n'; const bom = '\uFEFF'; const blob = new Blob([bom + header + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `siparisler_${new Date().toISOString().split('T')[0]}.csv`; link.click(); }} title="Excel olarak indir (CSV)"><FileSpreadsheet className="h-4 w-4 text-green-600" /></Button>
          <Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" /><span className="hidden sm:inline">Yeni Sipariş</span><span className="sm:hidden">Ekle</span></Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Yeni Sipariş</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Müşteri</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedCustomer} onChange={e => { setSelectedCustomer(e.target.value); setItems([]) }}>
                  <option value="">Müşteri seçin...</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.user?.name} ({c.discountRate > 0 ? `%${c.discountRate} indirim` : 'İndirim yok'})</option>)}
                </select>
              </div>
              {selectedCustomer && (
                <div className="space-y-2">
                  <Label>Ürün Ekle</Label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm" placeholder="Ürün ara..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                    {products.filter((p: any) => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())).map((p: any) => {
                      const price = getCustomerPrice(p.id) || p.salePrice
                      const item = items.find(i => i.productId === p.id)
                      return (
                        <div key={p.id} onClick={() => p.stock > 0 && addItem(p.id)} className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors ${p.stock <= 0 ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50' : item ? 'cursor-pointer border-blue-500 bg-blue-50' : 'cursor-pointer border-gray-200 hover:border-gray-300'}`}>
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="h-14 w-14 object-contain rounded bg-white shrink-0" />
                          ) : (
                            <div className="h-14 w-14 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400 shrink-0">No Img</div>
                          )}
                          <div className="shrink-0 text-xs font-mono text-gray-500 w-16">{p.code}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{p.name}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-blue-600 font-semibold">{formatCurrency(price)}</span>
                            {item ? (
                              <span className="block bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full mt-1">x{item.quantity}</span>
                            ) : (
                              <span className={`block text-xs mt-1 ${p.stock <= p.minStock ? 'text-orange-500' : 'text-gray-400'}`}>{p.stock} {p.unit}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {items.length > 0 && (
                <div className="border rounded-lg p-3 space-y-2">
                  {items.map(i => {
                    const p = products.find((pr: any) => pr.id === i.productId)
                    return (
                      <div key={i.productId} className="flex items-center justify-between text-sm">
                        <span>{p?.name}</span>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setItems(prev => prev.map(it => it.productId === i.productId ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it))} className="w-6 h-6 rounded bg-gray-100 text-sm">-</button>
                          <span className="w-6 text-center">{i.quantity}</span>
                          <button type="button" onClick={() => setItems(prev => prev.map(it => it.productId === i.productId ? { ...it, quantity: it.quantity + 1 } : it))} className="w-6 h-6 rounded bg-gray-100 text-sm">+</button>
                          <span className="font-semibold w-20 text-right">{formatCurrency(i.unitPrice * i.quantity)}</span>
                          <button type="button" onClick={() => setItems(prev => prev.filter(it => it.productId !== i.productId))} className="text-red-500 text-xs">✕</button>
                        </div>
                      </div>
                    )
                  })}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Toplam</span>
                    <span>{formatCurrency(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0))}</span>
                  </div>
                </div>
              )}
              <div className="space-y-2"><Label>Notlar</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Sipariş notu..." /></div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setItems([]); setProductSearch('') }}>İptal</Button>
                <Button type="submit">Sipariş Oluştur</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><Input className="pl-9" placeholder="Müşteri ara..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className="flex h-10 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="TUMU">Tüm Durumlar</option>
          <option value="HAZIRLANIYOR">Hazırlanıyor</option>
          <option value="TESLIM_EDILDI">Teslim Edildi</option>
          <option value="IPTAL">İptal</option>
        </select>
      </div>

      {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div> : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <Card className="py-8"><CardContent className="text-center text-gray-500 text-sm">Filtreye uyan sipariş bulunamadı</CardContent></Card>
          )}
          {filtered.map((o: any) => {
            const isExpanded = expanded === o.id
            const paidAmount = o.payments?.filter((p: any) => p.status === 'ODENDI').reduce((s: number, p: any) => s + p.amount, 0) || 0
            return (
              <Card key={o.id} className="overflow-hidden">
                <CardContent className="py-2 px-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="bg-blue-50 p-1.5 rounded-lg shrink-0"><ShoppingCart className="h-3.5 w-3.5 text-blue-600" /></div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{o.customer?.user?.name}</p>
                        {o.orderNumber && <p className="text-[11px] font-mono text-blue-600">{o.orderNumber}</p>}
                        {editDate?.id === o.id ? (
                          <div className="flex items-center gap-1 mt-1">
                            <Input
                              type="date"
                              className="h-6 w-32 text-[11px] py-0"
                              value={editDate?.value || ''}
                              onChange={e => setEditDate({ id: o.id, value: e.target.value })}
                              onKeyDown={e => { if (e.key === 'Enter' && editDate) saveDate(o.id, editDate.value); if (e.key === 'Escape') setEditDate(null) }}
                              autoFocus
                            />
                            <Button size="sm" className="h-6 px-2 py-0 text-[10px]" onClick={() => editDate && saveDate(o.id, editDate.value)}>Kaydet</Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 py-0 text-[10px]" onClick={() => setEditDate(null)}>İptal</Button>
                          </div>
                        ) : (
                          <p 
                            className="text-[11px] text-gray-500 cursor-pointer hover:text-blue-600 hover:underline" 
                            onClick={() => setEditDate({ id: o.id, value: new Date(o.orderDate || o.createdAt).toISOString().split('T')[0] })}
                            title="Tarih düzenlemek için tıklayın"
                          >
                            {formatDate(o.orderDate || o.createdAt)} • {o.orderItems?.length} ürün
                          </p>
                        )}
                        {/* Mobile amount */}
                        <div className="flex items-center gap-2 mt-0.5 sm:hidden text-[11px]">
                          <span className="font-bold">{formatCurrency(o.totalAmount)}</span>
                          {paidAmount > 0 && paidAmount < o.totalAmount ? (
                            <span className="text-red-500">Kalan: {formatCurrency(o.totalAmount - paidAmount)}</span>
                          ) : paidAmount >= o.totalAmount && o.totalAmount > 0 ? (
                            <span className="text-green-600">Ödendi</span>
                          ) : null}
                          <span className={`px-1.5 py-0.5 rounded-full ${ORDER_STATUS_COLOR[o.status] || 'bg-gray-100'}`}>
                            {o.status === 'TESLIM_EDILDI' ? 'Teslim' : o.status === 'IPTAL' ? 'İptal' : 'Hazırlanıyor'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Desktop amount + status */}
                      <div className="hidden sm:flex items-center gap-2 mr-1">
                        <div className="text-right">
                          <p className="font-bold text-sm">{formatCurrency(o.totalAmount)}</p>
                          {paidAmount > 0 && paidAmount < o.totalAmount ? (
                            <p className="text-xs text-red-500">Kalan: {formatCurrency(o.totalAmount - paidAmount)}</p>
                          ) : paidAmount >= o.totalAmount && o.totalAmount > 0 ? (
                            <p className="text-xs text-green-600">Ödendi</p>
                          ) : (
                            <p className="text-xs text-gray-400">Ödeme yok</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${ORDER_STATUS_COLOR[o.status] || 'bg-gray-100'}`}>
                          {o.status === 'TESLIM_EDILDI' ? 'Teslim Edildi' : o.status === 'IPTAL' ? 'İptal' : 'Hazırlanıyor'}
                        </span>
                      </div>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="sm" title="Ürün Listesi Yazdır" onClick={() => { const w = window.open('', '_blank'); if (!w) return; const items = o.orderItems?.map((i: any) => `<tr><td style='padding:4px 8px;border-bottom:1px solid #eee'>${i.product?.code || ''}</td><td style='padding:4px 8px;border-bottom:1px solid #eee'>${i.product?.name}</td><td style='padding:4px 8px;border-bottom:1px solid #eee;text-align:center'>${i.quantity}</td><td style='padding:4px 8px;border-bottom:1px solid #eee;text-align:right'>${i.unitPrice.toLocaleString('tr-TR')} ₺</td><td style='padding:4px 8px;border-bottom:1px solid #eee;text-align:right'>${(i.quantity * i.unitPrice).toLocaleString('tr-TR')} ₺</td></tr>`).join('') || ''; w.document.write(`<!DOCTYPE html><html><head><meta charset='utf-8'><title>Ürün Listesi</title><style>body{font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:0 auto}h2{text-align:center;border-bottom:2px solid #333;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#f0f0f0;padding:6px 8px;text-align:left;font-size:13px}td{font-size:12px}.info{background:#f9f9f9;padding:12px;border-radius:6px;margin:12px 0}.label{color:#666;font-size:11px}.value{font-weight:bold;font-size:14px}@media print{button{display:none}}</style></head><body><h2>ÜRÜN LİSTESİ</h2><div class='info'><div class='label'>Sipariş No</div><div class='value'>${o.orderNumber || o.id.slice(-8).toUpperCase()}</div><div class='label' style='margin-top:8px'>Müşteri</div><div class='value'>${o.customer?.user?.name || ''}</div><div class='label' style='margin-top:8px'>Tarih</div><div class='value'>${new Date(o.createdAt).toLocaleDateString('tr-TR')}</div></div><table><thead><tr><th>Kod</th><th>Ürün</th><th>Adet</th><th>Birim Fiyat</th><th>Toplam</th></tr></thead><tbody>${items}</tbody></table><div style='text-align:right;margin-top:12px;font-weight:bold'>Genel Toplam: ${o.totalAmount.toLocaleString('tr-TR', {style:'currency',currency:'TRY'})}</div><br><button onclick='window.print()' style='width:100%;padding:12px;background:#333;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer'>🖨️ Yazdır</button></body></html>`); w.document.close(); }}><Printer className="h-3 w-3 text-blue-600" /></Button>
                        <Button variant="ghost" size="sm" title="Koli Etiketi" onClick={() => { const w = window.open('', '_blank'); if (!w) return; const c = o.customer; w.document.write(`<!DOCTYPE html><html><head><meta charset='utf-8'><title>Koli Etiketi</title><style>body{font-family:Arial,sans-serif;padding:20px;max-width:400px;margin:0 auto}h2{text-align:center;border-bottom:2px solid #333;padding-bottom:8px}.info{background:#f9f9f9;padding:12px;border-radius:6px;margin:12px 0}.label{color:#666;font-size:11px}.value{font-weight:bold;font-size:14px}@media print{button{display:none}}</style></head><body><h2>KOLİ ETİKETİ</h2><div class='info'><div class='label'>Sipariş No</div><div class='value'>${o.orderNumber || o.id.slice(-8).toUpperCase()}</div><div class='label' style='margin-top:8px'>Tarih</div><div class='value'>${new Date(o.orderDate || o.createdAt).toLocaleDateString('tr-TR')}</div></div><div class='info'><div class='label'>Alıcı</div><div class='value'>${c?.user?.name || ''}</div><div class='label' style='margin-top:6px'>Telefon</div><div class='value'>${c?.phone || '-'}</div><div class='label' style='margin-top:6px'>TESLİMAT ADRESİ</div><div class='value' style='text-transform:uppercase;font-weight:bold'>${(o.shippingAddress || '-').toUpperCase()}${c?.city ? ', ' + c.city.toUpperCase() : ''}</div></div><div style='text-align:right;margin-top:12px;font-weight:bold'>Toplam: ${o.totalAmount.toLocaleString('tr-TR', {style:'currency',currency:'TRY'})}</div><br><button onclick='window.print()' style='width:100%;padding:12px;background:#333;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer'>🖨️ Yazdır</button></body></html>`); w.document.close(); }}><Package className="h-3 w-3 text-orange-600" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setExpanded(isExpanded ? null : o.id)}>{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 border-t pt-3 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-2">SİPARİŞ KALEMLERİ</p>
                        {o.orderItems?.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                            <div className="flex items-center gap-3">
                              {item.product?.imageUrl ? (
                                <img src={item.product.imageUrl} alt={item.product?.name} className="h-12 w-12 object-contain rounded border bg-white" />
                              ) : (
                                <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">No Img</div>
                              )}
                              <span><b>{item.product?.code}</b> - {item.product?.name} x{item.quantity}</span>
                            </div>
                            <span className="font-medium">{formatCurrency(item.total)}</span>
                          </div>
                        ))}
                      </div>
                      {(o.billingAddress || o.shippingAddress || o.paymentMethod) && (
                        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                          <p className="text-xs font-semibold text-gray-500 mb-2">SİPARİŞ BİLGİLERİ</p>
                          {o.paymentMethod && (
                            <div className="flex gap-2 text-xs">
                              <span className="text-gray-500 w-28 shrink-0">Ödeme Yöntemi:</span>
                              <span className="font-medium">
                                {o.paymentMethod === 'ACIK_HESAP' ? 'Açık Hesap' :
                                 o.paymentMethod === 'HAVALE' ? 'Havale / EFT' :
                                 o.paymentMethod === 'NAKIT' ? 'Nakit' :
                                 o.paymentMethod === 'KREDI_KARTI' ? 'Kredi Kartı' :
                                 o.paymentMethod === 'CEK' ? 'Çek' : o.paymentMethod}
                              </span>
                            </div>
                          )}
                          {o.billingAddress && (
                            <div className="flex gap-2 text-xs">
                              <span className="text-gray-500 w-28 shrink-0">Fatura Adresi:</span>
                              <span className="font-medium">{o.billingAddress}</span>
                            </div>
                          )}
                          {o.shippingAddress && o.shippingAddress !== o.billingAddress && (
                            <div className="flex gap-2 text-xs">
                              <span className="text-gray-500 w-28 shrink-0">Teslimat Adresi:</span>
                              <span className="font-medium">{o.shippingAddress}</span>
                            </div>
                          )}
                          {o.shippingAddress && o.shippingAddress === o.billingAddress && (
                            <div className="flex gap-2 text-xs">
                              <span className="text-gray-500 w-28 shrink-0">Teslimat Adresi:</span>
                              <span className="text-gray-400 italic">Fatura adresiyle aynı</span>
                            </div>
                          )}
                        </div>
                      )}
                      {editNotes?.id === o.id ? (
                        <div className="flex gap-2">
                          <Input
                            className="flex-1 h-8 text-sm"
                            value={editNotes!.value}
                            onChange={e => setEditNotes({ id: o.id, value: e.target.value })}
                            onKeyDown={e => { if (e.key === 'Enter') saveNotes(o.id, editNotes!.value); if (e.key === 'Escape') setEditNotes(null) }}
                            autoFocus
                          />
                          <Button size="sm" className="h-8" onClick={() => saveNotes(o.id, editNotes!.value)}>Kaydet</Button>
                          <Button size="sm" variant="outline" className="h-8" onClick={() => setEditNotes(null)}>İptal</Button>
                        </div>
                      ) : (
                        <div
                          className="bg-amber-50 border border-amber-100 rounded px-3 py-2 cursor-pointer hover:bg-amber-100 transition-colors"
                          onClick={() => setEditNotes({ id: o.id, value: o.notes || '' })}
                          title="Not düzenlemek için tıklayın"
                        >
                          <p className="text-xs text-amber-800">
                            <span className="font-semibold">Not:</span> {o.notes || <span className="italic text-amber-500">Not eklemek için tıklayın</span>}
                          </p>
                        </div>
                      )}
                      {(o.cargoCompany || o.trackingNumber) && (
                        <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                          <p className="text-xs font-semibold text-gray-500 mb-1">KARGO BİLGİLERİ</p>
                          {o.cargoCompany && <div className="flex gap-2 text-xs"><span className="text-gray-500 w-28 shrink-0">Kargo Firması:</span><span className="font-medium">{o.cargoCompany}</span></div>}
                          {o.trackingNumber && <div className="flex gap-2 text-xs"><span className="text-gray-500 w-28 shrink-0">Takip No:</span><span className="font-medium font-mono">{o.trackingNumber}</span></div>}
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        {(o.status === 'HAZIRLANIYOR') && <Button size="sm" onClick={() => setKargoDialog({ orderId: o.id, cargoCompany: o.cargoCompany || '', trackingNumber: o.trackingNumber || '' })} className="bg-blue-600 hover:bg-blue-700">Kargoya Verildi</Button>}
                        {(o.status === 'HAZIRLANIYOR' || o.status === 'KARGOYA_VERILDI') && <Button size="sm" onClick={() => openConfirmDialog(o.id, 'TESLIM_EDILDI')} className="bg-green-600 hover:bg-green-700">Teslim Edildi</Button>}
                        {(o.status === 'HAZIRLANIYOR' || o.status === 'KARGOYA_VERILDI') && <Button size="sm" variant="destructive" onClick={() => openConfirmDialog(o.id, 'IPTAL')}>İptal Et</Button>}
                        {o.status === 'KARGOYA_VERILDI' && <Button size="sm" variant="outline" onClick={() => setKargoDialog({ orderId: o.id, cargoCompany: o.cargoCompany || '', trackingNumber: o.trackingNumber || '' })}>Kargo Bilgisi Güncelle</Button>}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Kargo Dialog */}
      <Dialog open={!!kargoDialog} onOpenChange={() => setKargoDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              Kargo Bilgisi Gir
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Kargo Firması</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={kargoDialog?.cargoCompany || ''}
                onChange={e => setKargoDialog(prev => prev ? { ...prev, cargoCompany: e.target.value } : null)}
              >
                <option value="">Kargo firması seçin...</option>
                <option value="Yurtiçi">Yurtiçi Kargo</option>
                <option value="Aras">Aras Kargo</option>
                <option value="MNG">MNG Kargo</option>
                <option value="PTT">PTT Kargo</option>
                <option value="Trendyol">Trendyol Express</option>
                <option value="HepsiJET">HepsiJET</option>
                <option value="ÇiçekSepeti">ÇiçekSepeti</option>
                <option value="Getir">Getir</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Takip Numarası</Label>
              <Input
                placeholder="Kargo takip numarası"
                value={kargoDialog?.trackingNumber || ''}
                onChange={e => setKargoDialog(prev => prev ? { ...prev, trackingNumber: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setKargoDialog(null)}>İptal</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={saveKargo}>
              Kaydet &amp; Kargoya Verildi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Status Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl flex items-center gap-2">
              {confirmDialog?.status === 'TESLIM_EDILDI' ? (
                <>
                  <div className="bg-green-100 p-2 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-green-600" />
                  </div>
                  Sipariş Teslimat Onayı
                </>
              ) : (
                <>
                  <div className="bg-red-100 p-2 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-red-600" />
                  </div>
                  Sipariş İptal Onayı
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {confirmDialog && (() => {
            const order = orders.find(o => o.id === confirmDialog.orderId)
            return order ? (
              <div className="space-y-4 py-2">
                {/* Order Summary Card */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500">Müşteri</p>
                      <p className="font-semibold text-lg">{order.customer?.user?.name}</p>
                      <p className="text-sm text-gray-500">{order.customer?.user?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Sipariş Tarihi</p>
                      <p className="font-medium">{formatDate(order.orderDate || order.createdAt)}</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <p className="text-sm text-gray-500 mb-2">Sipariş İçeriği</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {order.orderItems?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-700">{item.product?.name} × {item.quantity}</span>
                          <span className="font-medium">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-semibold">Toplam Tutar</span>
                    <span className="text-xl font-bold text-blue-600">{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>

                {/* Warning/Info Box */}
                {confirmDialog.status === 'TESLIM_EDILDI' ? (
                  <div className="bg-green-50 border-l-4 border-green-500 rounded-r-lg p-4 space-y-4">
                    <p className="text-sm text-green-800">
                      <span className="font-semibold">Onay:</span> Bu siparişi teslim edildi olarak işaretlemek üzeresiniz. 
                      Sipariş teslim edildiğinde stok otomatik olarak azaltılacaktır.
                    </p>
                    
                    <div className="pt-2 border-t border-green-100 space-y-3">
                      <p className="text-xs font-bold text-green-700 uppercase">Gelecek Hatırlatıcı (Opsiyonel)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-green-700">Hatırlatma Tarihi</Label>
                          <Input 
                            type="date" 
                            className="h-8 text-xs border-green-200" 
                            value={confirmDialog.reminderAt || ''} 
                            onChange={e => setConfirmDialog({...confirmDialog, reminderAt: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-green-700">Hatırlatma Notu</Label>
                          <Input 
                            placeholder="Örn: Stok sor" 
                            className="h-8 text-xs border-green-200"
                            value={confirmDialog.reminderNote || ''}
                            onChange={e => setConfirmDialog({...confirmDialog, reminderNote: e.target.value})}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-green-600 italic">Müşteriyi tekrar ne zaman arayacağınızı veya ziyaret edeceğinizi belirleyebilirsiniz.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
                    <p className="text-sm text-red-800">
                      <span className="font-semibold">Dikkat:</span> Bu siparişi iptal etmek üzeresiniz. 
                      Bu işlem geri alınamaz. Sipariş iptal edilecek ve durumu değiştirilemez hale gelecektir.
                    </p>
                  </div>
                )}

                {/* Confirmation Question */}
                <p className="text-center text-gray-700 font-medium">
                  İşlemi onaylıyor musunuz?
                </p>
              </div>
            ) : null
          })()}
          
          <DialogFooter className="border-t pt-4 gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog(null)} className="flex-1">
              Vazgeç
            </Button>
            <Button 
              onClick={updateStatus}
              className={confirmDialog?.status === 'TESLIM_EDILDI' ? 'flex-1 bg-green-600 hover:bg-green-700' : 'flex-1'}
              variant={confirmDialog?.status === 'IPTAL' ? 'destructive' : 'default'}
              size="lg"
            >
              {confirmDialog?.status === 'TESLIM_EDILDI' ? (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Evet, Teslim Edildi
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Evet, İptal Et
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
