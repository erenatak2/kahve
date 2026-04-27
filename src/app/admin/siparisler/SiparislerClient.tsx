'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Plus, ShoppingCart, Search, ChevronDown, ChevronUp, Printer, Package, FileSpreadsheet, CalendarClock, RefreshCw, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn, formatCurrency, formatDate, ORDER_STATUS_COLOR } from '@/lib/utils'

interface SiparislerClientProps {
  initialOrders: any[]
  initialCustomers: any[]
  initialProducts: any[]
  session: any
}

export default function SiparislerClient({ initialOrders, initialCustomers, initialProducts, session }: SiparislerClientProps) {
  const [orders, setOrders] = useState<any[]>(initialOrders)
  const [customers, setCustomers] = useState<any[]>(initialCustomers)
  const [products, setProducts] = useState<any[]>(initialProducts)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('TUMU')
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [items, setItems] = useState<{ productId: string; quantity: number; unitPrice: number }[]>([])
  const [notes, setNotes] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [editNotes, setEditNotes] = useState<{ id: string; value: string } | null>(null)
  const [editDate, setEditDate] = useState<{ id: string; value: string } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ orderId: string; status: string; orderNumber?: string; reminderAt?: string; reminderNote?: string } | null>(null)
  const [reminderEdit, setReminderEdit] = useState<{ id: string, date: string, time: string, note: string, days: string } | null>(null)
  const [kargoDialog, setKargoDialog] = useState<{ orderId: string; cargoCompany: string; trackingNumber: string } | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchAll = () => {
    Promise.all([
      fetch('/api/siparisler').then(r => r.json()),
      fetch('/api/musteriler').then(r => r.json()),
      fetch('/api/urunler').then(r => r.json()),
    ]).then(([o, c, p]) => { setOrders(o); setCustomers(c); setProducts(p); setLoading(false) })
  }

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

  const formatInitialTime = (date: any) => {
    if (!date) return '09:00'
    const d = new Date(date)
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
  }

  const handleUpdateReminder = (id: string, note: string, date?: string, time?: string) => {
    // Tarih ve saat varsa reminderAt oluştur
    let reminderAt = undefined
    if (date && time) {
      reminderAt = new Date(`${date}T${time}`).toISOString()
    }

    // Optimistik güncelleme: UI hemen güncellenir
    setOrders(prev => prev.map(o => o.id === id ? {
      ...o,
      reminderNote: note,
      ...(reminderAt && { reminderAt })
    } : o))

    // UI hemen güncellenir - kullanıcı anında görür
    setSavedId(id)
    setEditingReminderId(null)
    setTimeout(() => setSavedId(null), 2000)

    // API çağrısı fire-and-forget - hemen başlar, arka planda çalışır
    fetch(`/api/siparisler/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reminderNote: note,
        ...(reminderAt && { reminderAt })
      }),
      keepalive: true
    }).catch(() => {
      // Hata olursa UI zaten güncellenmiş durumda, kullanıcı fark etmez
    })
  }

  const formatInitialDate = (date: any) => {
    if (!date) return ''
    return new Date(date).toISOString().split('T')[0]
  }

  const getDaysDiff = (dateStr: string) => {
    if (!dateStr) return ''
    const today = new Date(); today.setHours(0,0,0,0)
    const target = new Date(dateStr); target.setHours(0,0,0,0)
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 ? diff.toString() : '0'
  }

  const getDateAfterDays = (days: number) => {
    const d = new Date(); d.setDate(d.getDate() + (isNaN(days) ? 0 : days))
    return d.toISOString().split('T')[0]
  }

  const repeatOrder = (order: any) => {
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

    // Ürünleri sepete ekle
    setItems(order.orderItems.map((i: any) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice
    })))

    // Müşteriyi seç
    setSelectedCustomer(order.customerId)

    // Formu aç
    setShowForm(true)

    toast({ title: 'Ürünler sepete eklendi' })
  }

  const printOrder = (order: any) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const araToplam = order.totalAmount / 1.2;
    const kdv = order.totalAmount - araToplam;
    const itemsStr = (order.orderItems || []).map((i: any) => `
      <div class="item-row">
        <div class="item-code">${i.product?.code || ''}</div>
        <div class="item-name">${i.product?.name || '-'}</div>
        <div class="item-qty">x${i.quantity}</div>
        <div class="item-price">&#8378;${(i.unitPrice * i.quantity).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
      </div>
    `).join('');
    w.document.write(`<!DOCTYPE html><html><head><meta charset='utf-8'><title>Siparis ${order.orderNumber || order.id.slice(-8).toUpperCase()}</title>
    <style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif;padding:40px;color:#1e293b;max-width:800px;margin:0 auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .title{text-align:center;font-size:20px;font-weight:900;color:#0f172a;margin-bottom:20px;text-transform:uppercase;letter-spacing:.5px}
    .meta-row{display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:#475569;margin-bottom:12px}
    .divider{border-bottom:2px solid #64748b;margin-bottom:25px}
    .customer-box{background:#f8fafc;border:1px solid #f1f5f9;border-radius:6px;padding:16px 20px;margin-bottom:30px;font-size:13px;line-height:1.6;color:#334155}
    .customer-name{font-size:16px;font-weight:800;color:#0f172a;margin-bottom:4px;display:block}
    .section-title{font-size:14px;font-weight:800;color:#0f172a;margin-bottom:12px}
    .section-divider{border-bottom:1px solid #cbd5e1;margin-bottom:15px}
    .item-row{display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px}
    .item-code{font-family:monospace;color:#94a3b8;font-size:11px;font-weight:700;width:60px;flex-shrink:0}
    .item-name{flex:1;color:#475569;padding-right:15px}
    .item-qty{width:50px;text-align:right;font-weight:800;color:#0f172a}
    .item-price{width:90px;text-align:right;font-weight:800;color:#0f172a}
    .totals-container{margin-top:25px;border-top:2px solid #0f172a;padding-top:15px}
    .totals-box{width:100%;font-size:13px;color:#475569}
    .total-row{display:flex;justify-content:space-between;margin-bottom:8px;padding:6px 0}
    .total-row span:first-child{font-weight:600;color:#64748b}
    .total-row span:last-child{font-weight:700;color:#0f172a}
    .grand-total{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid #cbd5e1;font-size:16px;font-weight:900;color:#0f172a}
    .note-box{background:#fffdeb;border:1px solid #fef08a;padding:12px 16px;border-radius:4px;margin-top:30px;font-size:13px;color:#422006}
    .print-btn-container{text-align:center;margin-top:50px}
    .print-btn{background:#0f172a;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-weight:700;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
    @media print{body{padding:0}.no-print{display:none!important}}</style></head><body>
    <div class="title">S&#304;PAR&#304;&#350; F&#304;&#350;&#304;</div>
    <div class="meta-row"><span>TAR&#304;H: ${new Date(order.orderDate || order.createdAt).toLocaleDateString('tr-TR')}</span><span>S&#304;PAR&#304;&#350; NO: ${order.orderNumber || order.id.slice(-8).toUpperCase()}</span></div>
    <div class="divider"></div>
    <div class="customer-box">
      <span class="customer-name">${order.customer?.companyName ? order.customer.companyName.toUpperCase() + ' / ' + (order.customer?.user?.name || '') : order.customer?.user?.name || '-'}</span>
      ${order.customer?.companyName ? '<div><strong>Firma:</strong> ' + order.customer.companyName + '</div>' : ''}
      ${(order.customer?.taxOffice || order.customer?.taxNumber) ? '<div><strong>VD/VKN:</strong> ' + (order.customer.taxOffice || '') + ' / ' + (order.customer.taxNumber || '') + '</div>' : ''}
      ${order.customer?.phone ? '<div><strong>Tel:</strong> ' + order.customer.phone + '</div>' : ''}
      ${order.customer?.address ? '<div><strong>Adres:</strong> ' + order.customer.address + '</div>' : ''}
    </div>
    <div class="section-title">Sipari&#351; Kalemleri</div>
    <div class="section-divider"></div>
    <div>${itemsStr}</div>
    <div class="totals-container">
      <div class="totals-box">
        <div class="total-row"><span>Ara Toplam</span><span>&#8378;${araToplam.toLocaleString('tr-TR', {minimumFractionDigits:2})}</span></div>
        <div class="total-row"><span>KDV (%20)</span><span>&#8378;${kdv.toLocaleString('tr-TR', {minimumFractionDigits:2})}</span></div>
        <div class="grand-total"><span>Genel Toplam</span><span>&#8378;${order.totalAmount.toLocaleString('tr-TR', {minimumFractionDigits:2})}</span></div>
      </div>
    </div>
    ${order.notes ? '<div class="note-box"><strong>Not:</strong> ' + order.notes + '</div>' : ''}
    <div class="print-btn-container no-print"><button class="print-btn" onclick="window.print()">&#128424; Yazd&#305;r</button></div>
    </body></html>`);
    w.document.close();
  }

  const printLabel = (order: any) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const orderNo = (order.orderNumber || order.id.slice(-8)).toUpperCase();
    const customerName = order.customer?.user?.name || '-';
    const companyName = order.customer?.companyName || '';
    const recipientAddress = order.customer?.address || 'Adres belirtilmemis';
    const recipientPhone = order.customer?.phone || '-';
    const itemsHtml = (order.orderItems || []).map((i: any) => 
      `<div style="border-bottom:1px dashed #eee; padding:4px 0;">• ${i.product?.name || 'Urun'} <span style="color: #2563eb; font-weight: 900;">x${i.quantity}</span></div>`
    ).join('');

    w.document.write(`
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="utf-8">
        <title>Etiket - ${orderNo}</title>
        <style>
          body { font-family: sans-serif; margin: 0; padding: 10px; display: flex; justify-content: center; background: #fff; }
          .label-box { border: 2px solid #000; padding: 15px; width: 80mm; min-height: 80mm; background: #fff; }
          .title { font-weight: bold; font-size: 14px; border-bottom: 2px solid #000; margin-bottom: 10px; padding-bottom: 5px; text-align: center; text-transform: uppercase; }
          .section { margin-bottom: 10px; }
          .label-text { font-size: 9px; font-weight: bold; color: #555; text-transform: uppercase; display: block; margin-bottom: 1px; }
          .value-text { font-size: 15px; font-weight: bold; color: #000; display: block; line-height: 1.2; word-break: break-word; }
          .items-section { margin-top: 15px; border-top: 1px solid #000; padding-top: 8px; }
          @media print { 
            body { padding: 0; }
            .label-box { border: 1px solid #000; width: 100%; box-shadow: none; }
            .no-print { display: none; }
            @page { size: auto; margin: 5mm; }
          }
        </style>
      </head>
      <body>
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div class="label-box">
            <div class="title">KOLİ ETİKETİ</div>
            
            <div class="section">
              <span class="label-text">AD SOYAD:</span>
              <span class="value-text">${customerName}</span>
            </div>

            ${companyName ? `
            <div class="section">
              <span class="label-text">ŞİRKET:</span>
              <span class="value-text">${companyName}</span>
            </div>` : ''}

            <div class="section">
              <span class="label-text">TELEFON:</span>
              <span class="value-text">${recipientPhone}</span>
            </div>

            <div class="section">
              <span class="label-text">TESLİMAT ADRESİ:</span>
              <span class="value-text" style="font-size: 13px;">${recipientAddress}</span>
            </div>

            <div class="section">
              <span class="label-text">SİPARİŞ NUMARASI:</span>
              <span class="value-text">${orderNo}</span>
            </div>

            <div class="items-section">
              <span class="label-text">ÜRÜNLER:</span>
              <div style="font-size: 12px; font-weight: bold;">${itemsHtml}</div>
            </div>
          </div>
          <div class="no-print" style="margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 25px; cursor: pointer; font-weight: bold; background: #000; color: #fff; border: none; border-radius: 5px;">Yazdır</button>
          </div>
        </div>
      </body>
      </html>
    `);
    w.document.close();
  }

  const filtered = orders.filter((o: any) => {
    const nameMatch = o.customer?.user?.name?.toLowerCase().includes(search.toLowerCase())
    const statusMatch = statusFilter === 'TUMU' || o.status === statusFilter
    const isMyCustomer = session?.user?.role === 'ADMIN' || o.customer?.salesRepId === (session?.user as any)?.id
    return nameMatch && statusMatch && isMyCustomer
  })

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Siparişler</h1>
            <p className="text-gray-500 text-sm">
              {filtered.length !== orders.length ? `${filtered.length} / ${orders.length} sipariş` : `${orders.length} sipariş`}
              {filtered.length > 0 && ` • ${formatCurrency(filtered.reduce((s: number, o: any) => s + o.totalAmount, 0))}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { 
            const w = window.open('', '_blank'); 
            if (!w) return; 
            const hazirlaniyor = filtered.filter((o: any) => o.status === 'HAZIRLANIYOR'); 
            let html = ''; 
            hazirlaniyor.forEach((o: any) => { 
              const itemsStr = o.orderItems?.map((i: any) => `
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
                   <div style='margin-bottom:8px'>${itemsStr}</div>
                   <div style='display:flex;justify-content:flex-end;align-items:center;gap:6px;font-size:8px;color:#94a3b8;font-weight:bold'>
                      OK <div style='width:12px;height:12px;border:1.5px solid #e2e8f0;border-radius:3px'></div>
                   </div>
                </div>`; 
            }); 
            const total = hazirlaniyor.reduce((s: number, o: any) => s + o.totalAmount, 0); 
            const araToplam = total / 1.2;
            const kdvTutari = total - araToplam;
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
                  .meta { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 6px; font-size: 10px; font-weight: 700; color: #64748b; }
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
                    <span class='sum-box'>ARA TOPLAM: ${araToplam.toLocaleString('tr-TR', {style:'currency',currency:'TRY',minimumFractionDigits:2})}</span>
                    <span class='sum-box'>KDV (%20): ${kdvTutari.toLocaleString('tr-TR', {style:'currency',currency:'TRY',minimumFractionDigits:2})}</span>
                    <span class='sum-box' style='background:#f1f5f9'>GENEL TOPLAM: ${total.toLocaleString('tr-TR', {style:'currency',currency:'TRY',minimumFractionDigits:0})}</span>
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
          <Button variant="outline" size="sm" onClick={() => { const csv = filtered.map((o: any) => { const itemsStr = o.orderItems?.map((i: any) => `${i.product?.code || ''}-${i.product?.name}(${i.quantity})`).join(', '); return `${o.orderNumber || o.id.slice(-8).toUpperCase()},${o.customer?.user?.name || ''},${new Date(o.createdAt).toLocaleDateString('tr-TR')},"${itemsStr}",${o.totalAmount},${o.status === 'TESLIM_EDILDI' ? 'Teslim Edildi' : o.status === 'IPTAL' ? 'İptal' : 'Hazırlanıyor'}`; }).join('\n'); const header = 'Sipariş No,Müşteri,Tarih,Ürünler,Tutar,Durum\n'; const bom = '\uFEFF'; const blob = new Blob([bom + header + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `siparisler_${new Date().toISOString().split('T')[0]}.csv`; link.click(); }} title="Excel olarak indir (CSV)"><FileSpreadsheet className="h-4 w-4 text-green-600" /></Button>
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
                      <div key={i.productId} className="flex flex-col xl:flex-row xl:items-center justify-between text-sm py-2 border-b last:border-0 gap-3">
                        <span className="font-medium flex-1">{p?.name}</span>
                        <div className="flex items-center gap-2 shrink-0 self-end xl:self-auto">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-2.5 text-xs font-black bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 hover:text-orange-700 uppercase tracking-tight shadow-sm" 
                            onClick={() => setItems(prev => prev.map(it => it.productId === i.productId ? { ...it, quantity: it.quantity + 300 } : it))}
                          >
                            + Koli (300)
                          </Button>
                          <div className="flex items-center border rounded-lg overflow-hidden bg-white shadow-sm">
                            <button type="button" onClick={() => setItems(prev => prev.map(it => it.productId === i.productId ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it))} className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors font-bold">-</button>
                            <input 
                              type="number" 
                              min="1" 
                              value={i.quantity === 0 ? '' : i.quantity} 
                              onChange={(e) => {
                                const val = parseInt(e.target.value)
                                setItems(prev => prev.map(it => it.productId === i.productId ? { ...it, quantity: isNaN(val) ? 0 : val } : it))
                              }}
                              onBlur={() => {
                                if (i.quantity < 1) setItems(prev => prev.map(it => it.productId === i.productId ? { ...it, quantity: 1 } : it))
                              }}
                              className="w-16 h-8 text-center border-x font-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800" 
                            />
                            <button type="button" onClick={() => setItems(prev => prev.map(it => it.productId === i.productId ? { ...it, quantity: i.quantity + 1 } : it))} className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors font-bold">+</button>
                          </div>
                          <span className="font-black w-24 text-right text-blue-700 text-base">{formatCurrency(i.unitPrice * Math.max(1, i.quantity))}</span>
                          <button type="button" onClick={() => setItems(prev => prev.filter(it => it.productId !== i.productId))} className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1" title="Sil">✕</button>
                        </div>
                      </div>
                    )
                  })}
                  <div className="border-t pt-2 space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Ara Toplam</span>
                      <span>{formatCurrency(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) / 1.2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>KDV (%20)</span>
                      <span>{formatCurrency(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) - (items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) / 1.2))}</span>
                    </div>
                    <div className="flex justify-between font-bold text-blue-600">
                      <span>Genel Toplam</span>
                      <span>{formatCurrency(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0))}</span>
                    </div>
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
          <option value="KARGOYA_VERILDI">Kargoya Verildi</option>
          <option value="TESLIM_EDILDI">Teslim Edildi</option>
          <option value="IPTAL">İptal</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <Card className="py-8"><CardContent className="text-center text-gray-500 text-sm">Filtreye uyan sipariş bulunamadı</CardContent></Card>}
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
                      <p className="font-semibold text-sm truncate flex items-center gap-2">
                        {o.customer?.user?.name}
                      </p>
                      {o.orderNumber && <p className="text-[11px] font-mono text-blue-600">{o.orderNumber}</p>}
                      {editDate?.id === o.id ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Input type="date" className="h-6 w-32 text-[11px] py-0" value={editDate?.value || ''} onChange={e => setEditDate({ id: o.id, value: e.target.value })} autoFocus />
                          <Button size="sm" className="h-6 px-2 py-0 text-[10px]" onClick={() => editDate && saveDate(o.id, editDate.value)}>Kaydet</Button>
                          <Button size="sm" variant="outline" className="h-6 px-2 py-0 text-[10px]" onClick={() => setEditDate(null)}>İptal</Button>
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-500 cursor-pointer hover:text-blue-600 hover:underline" onClick={() => setEditDate({ id: o.id, value: new Date(o.orderDate || o.createdAt).toISOString().split('T')[0] })} title="Tarih düzenlemek için tıklayın">
                          {formatDate(o.orderDate || o.createdAt)} • {o.orderItems?.length} ürün
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="hidden sm:flex items-center gap-2 mr-1">
                      <div className="text-right">
                        <p className="font-bold text-base text-slate-900 leading-none">{formatCurrency(o.totalAmount)}</p>
                        {paidAmount > 0 && paidAmount < o.totalAmount ? (
                          <p className="text-xs font-bold text-red-600 mt-1">Kalan: {formatCurrency(o.totalAmount - paidAmount)}</p>
                        ) : paidAmount >= o.totalAmount && o.totalAmount > 0 ? (
                          <p className="text-xs font-bold text-green-700 mt-1 flex items-center justify-end gap-1">TAM ÖDENDİ ✓</p>
                        ) : (
                          <p className="text-xs font-semibold text-slate-500 mt-1">Bakiye: {formatCurrency(o.totalAmount)}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${ORDER_STATUS_COLOR[o.status] || 'bg-gray-100'}`}>
                        {o.status === 'TESLIM_EDILDI' ? 'Teslim' : o.status === 'IPTAL' ? 'İptal' : 'Hazırlanıyor'}
                      </span>
                    </div>
                    <div className="flex gap-0.5">
                      {o.status === 'TESLIM_EDILDI' && (
                        <Button variant="ghost" size="sm" title="Takip Ayarları" className={cn(o.reminderAt ? "text-orange-600 bg-orange-50" : "text-gray-400")} onClick={(e) => { e.stopPropagation(); setExpanded(isExpanded ? null : o.id) }}>
                          <CalendarClock className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" title="Yazdır" onClick={(e) => { e.stopPropagation(); printOrder(o) }}>
                        <Printer className="h-3 w-3 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Koli Etiketi" onClick={(e) => { e.stopPropagation(); printLabel(o) }}>
                        <Package className="h-3 w-3 text-orange-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setExpanded(isExpanded ? null : o.id)}>{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-3 border-t pt-3 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Sipariş Kalemleri</p>
                      {o.orderItems?.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            {item.product?.imageUrl ? <img src={item.product.imageUrl} className="h-10 w-10 object-contain rounded border bg-white" /> : <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-[10px]">Yok</div>}
                            <span><b>{item.product?.code}</b> - {item.product?.name} x{item.quantity}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                      <div className="mt-4 pt-3 border-t space-y-2 bg-slate-50 p-4 rounded-xl border">
                        <div className="flex justify-between text-[13px] text-slate-700"><span>Ara Toplam</span><span>{formatCurrency(o.totalAmount / 1.2)}</span></div>
                        <div className="flex justify-between text-[13px] text-slate-700"><span>KDV (%20)</span><span>{formatCurrency(o.totalAmount - (o.totalAmount / 1.2))}</span></div>
                        <div className="flex justify-between text-base font-bold text-blue-800 border-t pt-2 mt-1"><span>Genel Toplam</span><span>{formatCurrency(o.totalAmount)}</span></div>
                      </div>
                    </div>


                    {o.notes && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Müşteri Notu</p>
                        <p className="text-sm text-blue-900">{o.notes}</p>
                      </div>
                    )}

                    {o.status === 'TESLIM_EDILDI' && (
                      <div className={cn("mt-4 pt-4 border-t border-orange-100 p-4 rounded-xl border", editingReminderId === o.id ? "bg-yellow-50" : "bg-orange-50/30")}>
                        <div className="flex flex-col md:flex-row gap-3">
                          <div className="flex-1 space-y-2">
                             <div className="flex flex-wrap gap-2 cursor-pointer" onClick={() => { if (editingReminderId !== o.id) setEditingReminderId(o.id) }} onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                 e.preventDefault()
                                 const current = reminderEdit?.id === o.id ? reminderEdit : { id: o.id, date: formatInitialDate(o.reminderAt), time: formatInitialTime(o.reminderAt), note: o.reminderNote || '', days: getDaysDiff(o.reminderAt) }
                                 handleUpdateReminder(o.id, current!.note, current!.date, current!.time)
                               } else if (e.key === 'Escape') {
                                 e.preventDefault()
                                 setEditingReminderId(null)
                                 setReminderEdit(null)
                               }
                             }}>
                                <Input
                                  type="date"
                                  className="w-full md:w-40 bg-white"
                                  value={editingReminderId === o.id ? (reminderEdit?.date || formatInitialDate(o.reminderAt)) : formatInitialDate(o.reminderAt)}
                                  readOnly={editingReminderId !== o.id}
                                  onClick={() => { if (editingReminderId !== o.id) setEditingReminderId(o.id) }}
                                  onChange={e => {
                                    if (editingReminderId === o.id) {
                                      setReminderEdit(prev => prev ? { ...prev, date: e.target.value } : { id: o.id, date: e.target.value, time: formatInitialTime(o.reminderAt), note: o.reminderNote || '', days: getDaysDiff(o.reminderAt) })
                                    }
                                  }}
                                />
                                <Input
                                  type="time"
                                  className="w-full md:w-28 bg-white"
                                  value={editingReminderId === o.id ? (reminderEdit?.time || formatInitialTime(o.reminderAt)) : formatInitialTime(o.reminderAt)}
                                  readOnly={editingReminderId !== o.id}
                                  onClick={() => { if (editingReminderId !== o.id) setEditingReminderId(o.id) }}
                                  onChange={e => {
                                    if (editingReminderId === o.id) {
                                      setReminderEdit(prev => prev ? { ...prev, time: e.target.value } : { id: o.id, date: formatInitialDate(o.reminderAt), time: e.target.value, note: o.reminderNote || '', days: getDaysDiff(o.reminderAt) })
                                    }
                                  }}
                                />
                                <Input
                                  placeholder="Takip notu..."
                                  className="flex-1 bg-white min-w-[200px]"
                                  value={reminderEdit?.id === o.id ? reminderEdit!.note : (o.reminderNote || '')}
                                  readOnly={editingReminderId !== o.id}
                                  onChange={e => {
                                    const newNote = e.target.value
                                    setReminderEdit({
                                      id: o.id,
                                      date: reminderEdit?.id === o.id ? reminderEdit!.date : formatInitialDate(o.reminderAt),
                                      time: reminderEdit?.id === o.id ? reminderEdit!.time : formatInitialTime(o.reminderAt),
                                      note: newNote,
                                      days: reminderEdit?.id === o.id ? reminderEdit!.days : getDaysDiff(o.reminderAt)
                                    })
                                  }}
                                />
                                {editingReminderId === o.id ? (
                                  <div className="flex gap-1">
                                    <Button
                                      onClick={() => {
                                        const current = reminderEdit?.id === o.id ? reminderEdit : { id: o.id, date: formatInitialDate(o.reminderAt), time: formatInitialTime(o.reminderAt), note: o.reminderNote || '', days: getDaysDiff(o.reminderAt) }
                                        handleUpdateReminder(o.id, current!.note, current!.date, current!.time)
                                      }}
                                      className="bg-green-600 hover:bg-green-700 text-white font-bold h-9 w-9 p-0"
                                      title="Kaydet"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      onClick={() => { setEditingReminderId(null); setReminderEdit(null) }}
                                      variant="outline"
                                      className="font-bold h-9 w-9 p-0 text-gray-600"
                                      title="İptal"
                                    >
                                      <span className="text-xs">✕</span>
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => setEditingReminderId(o.id)}
                                    variant="outline"
                                    className="font-bold border-orange-600 text-orange-600 hover:bg-orange-50"
                                  >
                                    Düzenle
                                  </Button>
                                )}
                             </div>
                             <div className="flex items-center justify-between">
                               <div className="flex items-center gap-1.5 text-[10px] font-black text-orange-600 uppercase tracking-tighter">
                                  <CalendarClock className="h-3 w-3" />
                                  TAKİP HATIRLATICISI
                               </div>
                               {savedId === o.id && (
                                 <span className="text-[10px] font-black text-green-600 uppercase animate-in fade-in slide-in-from-right-2">✓ Kaydedildi</span>
                               )}
                             </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                        {o.status === 'HAZIRLANIYOR' && <Button size="sm" onClick={() => setKargoDialog({ orderId: o.id, cargoCompany: o.cargoCompany || '', trackingNumber: o.trackingNumber || '' })} className="bg-blue-600 hover:bg-blue-700">Kargoya Verildi</Button>}
                        {o.status !== 'TESLIM_EDILDI' && o.status !== 'IPTAL' && <Button size="sm" onClick={() => openConfirmDialog(o.id, 'TESLIM_EDILDI')} className="bg-green-600 hover:bg-green-700 text-white">Teslim Edildi</Button>}
                        {o.status !== 'TESLIM_EDILDI' && o.status !== 'IPTAL' && <Button size="sm" variant="destructive" onClick={() => openConfirmDialog(o.id, 'IPTAL')}>İptal Et</Button>}
                        <Button size="sm" variant="outline" onClick={() => repeatOrder(o)}><RefreshCw className="h-3.5 w-3.5 mr-1" />Tekrarla</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{confirmDialog?.status === 'TESLIM_EDILDI' ? 'Teslim Onayı' : 'İptal Onayı'}</DialogTitle></DialogHeader>
          <div className="py-2">Bu siparişi {confirmDialog?.status === 'TESLIM_EDILDI' ? 'teslim edildi' : 'iptal edildi'} olarak işaretlemek istediğinize emin misiniz?</div>
          <DialogFooter><Button variant="outline" onClick={() => setConfirmDialog(null)}>Vazgeç</Button><Button onClick={updateStatus} variant={confirmDialog?.status === 'IPTAL' ? 'destructive' : 'default'} className={confirmDialog?.status === 'TESLIM_EDILDI' ? 'bg-green-600 hover:bg-green-700' : ''}>Onayla</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!kargoDialog} onOpenChange={() => setKargoDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Kargo Bilgisi</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Firma</Label><Input value={kargoDialog?.cargoCompany || ''} onChange={e => setKargoDialog(prev => prev ? {...prev, cargoCompany: e.target.value} : null)} /></div>
            <div className="space-y-1.5"><Label>Takip No</Label><Input value={kargoDialog?.trackingNumber || ''} onChange={e => setKargoDialog(prev => prev ? {...prev, trackingNumber: e.target.value} : null)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setKargoDialog(null)}>İptal</Button><Button onClick={saveKargo}>Kargoya Ver</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
