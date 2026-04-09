'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { CreditCard, CheckCircle, Clock, AlertCircle, Search, Trash2, AlertTriangle, Edit3, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency, formatDate, PAYMENT_STATUS_COLOR, PAYMENT_METHOD } from '@/lib/utils'

export default function TahsilatPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('TUMU')
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ amount: '', method: 'NAKIT', notes: '', dueDate: '' })
  const { toast } = useToast()

  const fetchPayments = () => {
    fetch(`/api/tahsilat?month=${filterMonth}&year=${filterYear}`)
      .then(r => r.json())
      .then(d => { setPayments(d); setLoading(false) })
  }

  useEffect(() => { fetchPayments() }, [filterMonth, filterYear])

  const markPaid = async (id: string) => {
    const res = await fetch(`/api/tahsilat/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ODENDI', paidAt: new Date().toISOString() }),
    })
    if (res.ok) { toast({ title: 'Tahsilat ödendi olarak işaretlendi' }); fetchPayments() }
  }

  const markLate = async (id: string) => {
    await fetch(`/api/tahsilat/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'GECIKTI' }),
    })
    fetchPayments()
  }

  const deletePayment = (id: string) => {
    setConfirmAction({
      message: 'Bu tahsilat kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      onConfirm: async () => {
        const res = await fetch(`/api/tahsilat/${id}`, { method: 'DELETE' })
        if (res.ok) { toast({ title: 'Tahsilat silindi' }); fetchPayments() }
        else toast({ title: 'Hata', variant: 'destructive' })
        setConfirmAction(null)
      }
    })
  }

  const startInlineEdit = (payment: any) => {
    setInlineEditingId(payment.id)
    setEditForm({
      amount: payment.amount.toString(),
      method: payment.method || 'NAKIT',
      notes: payment.notes || '',
      dueDate: payment.dueDate ? new Date(payment.dueDate).toISOString().split('T')[0] : ''
    })
  }

  const cancelInlineEdit = () => {
    setInlineEditingId(null)
    setEditForm({ amount: '', method: 'NAKIT', notes: '', dueDate: '' })
  }

  const saveInlineEdit = async (payment: any) => {
    const res = await fetch(`/api/tahsilat/${payment.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(editForm.amount),
        method: editForm.method,
        notes: editForm.notes,
        dueDate: editForm.dueDate || null,
        status: payment.status
      }),
    })
    if (res.ok) {
      toast({ title: 'Tahsilat güncellendi' })
      setInlineEditingId(null)
      fetchPayments()
    } else {
      toast({ title: 'Güncelleme başarısız', variant: 'destructive' })
    }
  }

  const handleUpdateTotalCollected = async (p: any) => {
    // Akıllı hesap makinesi desteği (2+2-1 enter -> 3)
    let newVal = 0
    const rawVal = editForm.amount.toString().replace(/,/g, '.')
    
    try {
      // Sadece sayılar ve + - * / karakterlerine izin ver (Güvenlik için)
      if (/^[0-9+\-*/(). ]+$/.test(rawVal)) {
        // eslint-disable-next-line no-eval
        newVal = eval(rawVal)
      } else {
        newVal = parseFloat(rawVal)
      }
    } catch {
      newVal = parseFloat(rawVal)
    }

    const oldVal = p.totalPaid || 0
    const delta = newVal - oldVal

    if (isNaN(newVal) || delta === 0) {
      cancelInlineEdit()
      return
    }

    // Her türlü fark (artış veya azalış) işlensin (Hata düzeltmeye izin ver)
    if (delta !== 0) {
      const res = await fetch(`/api/tahsilat/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: delta,
          status: 'ODENDI',
          notes: delta > 0 ? 'Ek Tahsilat' : 'Tahsilat Azaltma (Geri Alım)',
          splitRemainder: false,
          isAdjustment: true // API'de sadece farkı eklemesini sağlar
        }),
      })

      if (res.ok) {
        toast({ title: 'Tahsilat düzeltildi' })
        setInlineEditingId(null)
        fetchPayments()
      } else {
        toast({ title: 'Güncelleme yapılamadı', variant: 'destructive' })
      }
    }
  }
 
  const revertToPending = async (id: string) => {
    // Bulunan kaydı beklemeye çek
    const res = await fetch(`/api/tahsilat/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'BEKLIYOR' }),
    })

    if (res.ok) {
      toast({ title: 'Durum beklendiğine alındı' })
      setConfirmAction(null)
      fetchPayments()
    } else {
      toast({ title: 'Hata oluştu', variant: 'destructive' })
    }
  }

  const filtered = payments.filter(p => {
    const orderDate = p.order?.orderDate || p.order?.createdAt
    const d = orderDate ? new Date(orderDate) : null
    
    // Akıllı Filtre: Ya seçilen ayda olmalı YA DA durumu "Ödenmedi" olup geçmişten gelmeli
    const isPastDue = p.status !== 'ODENDI' && p.amount >= 0.01
    const isCurrentPeriod = d ? (d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear) : false
    
    const monthMatch = isCurrentPeriod || isPastDue
    
    const nameMatch = !search || p.order?.customer?.user?.name?.toLowerCase().includes(search.toLowerCase())
    const statusMatch = statusFilter === 'TUMU' || p.status === statusFilter
    
    return monthMatch && nameMatch && statusMatch
  })

  // Bir sipariş için sadece bir kart göster (Ödeme bazlı değil Sipariş bazlı gruplama)
  const groupedByOrder: any[] = []
  const orderIdsUsed = new Set()

  filtered.forEach(p => {
    if (!p.orderId) {
      groupedByOrder.push({ ...p, totalPaid: p.status === 'ODENDI' ? p.amount : 0, remainingDebt: p.status !== 'ODENDI' ? p.amount : 0, totalDebt: p.amount })
      return
    }

    if (orderIdsUsed.has(p.orderId)) return

    const orderPayments = payments.filter(op => op.orderId === p.orderId)
    const paidTotal = orderPayments.filter(op => op.status === 'ODENDI').reduce((s, op) => s + op.amount, 0)
    const totalAmount = p.order?.totalAmount || orderPayments.reduce((s, op) => s + op.amount, 0)
    
    // UI için en anlamlı ana kaydı seç (varsa bekleyen, yoksa en son ödenen)
    const mainRecord = orderPayments.find(op => op.status === 'BEKLIYOR' || op.status === 'GECIKTI') || p

    groupedByOrder.push({
      ...mainRecord,
      totalPaid: paidTotal,
      remainingDebt: Math.max(0, totalAmount - paidTotal),
      totalDebt: totalAmount
    })
    orderIdsUsed.add(p.orderId)
  })

  const today = new Date()
  const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000

  // Toplam Alacak (Tüm kanallardan bekleyen grand total)
  const totalBekliyor = payments
    .filter(p => p.status !== 'ODENDI' && p.amount >= 0.01)
    .reduce((sum, p) => sum + p.amount, 0)
  
  // Gecikenler (Bu alacağın ne kadarı vadesi geçmiş?)
  const totalGecikti = payments
    .filter(p => {
       if (p.status === 'ODENDI' || p.amount < 0.01) return false;
       const orderDate = p.order?.orderDate || p.order?.createdAt;
       if (!orderDate) return false;
       const graceDate = new Date(new Date(orderDate).getTime() + fifteenDaysMs);
       graceDate.setHours(23, 59, 59, 999); // 15. günün sonuna kadar beklet
       return today > graceDate;
    })
    .reduce((sum, p) => sum + p.amount, 0)

  // Tahsil edilen sadece seçili aya aittir (Ciro mantığı)
  const totalOdendi = filtered
    .filter(p => p.status === 'ODENDI')
    .reduce((sum, p) => sum + p.amount, 0)

  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            Tahsilat
            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-normal">GÜNCEL v4</span>
          </h1>
          <p className="text-gray-500 text-sm">Ödeme takibi ve tahsilat yönetimi</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="flex h-10 rounded-md border border-input bg-background px-3 text-sm" value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))}>
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="flex h-10 rounded-md border border-input bg-background px-3 text-sm" value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 px-3 md:pt-6">
            <div className="flex items-center gap-2">
              <div className="bg-yellow-50 p-1.5 md:p-2 rounded-lg shrink-0"><Clock className="h-4 w-4 md:h-5 md:w-5 text-yellow-600" /></div>
              <div className="min-w-0"><p className="text-xs text-gray-500">Bekleyen</p><p className="font-bold text-sm md:text-lg truncate">{formatCurrency(totalBekliyor)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-3 md:pt-6">
            <div className="flex items-center gap-2">
              <div className="bg-green-50 p-1.5 md:p-2 rounded-lg shrink-0"><CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600" /></div>
              <div className="min-w-0"><p className="text-xs text-gray-500">Tahsil</p><p className="font-bold text-sm md:text-lg truncate">{formatCurrency(totalOdendi)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-3 md:pt-6">
            <div className="flex items-center gap-2">
              <div className="bg-red-50 p-1.5 md:p-2 rounded-lg shrink-0"><AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-red-600" /></div>
              <div className="min-w-0"><p className="text-xs text-gray-500">Gecikmiş</p><p className="font-bold text-sm md:text-lg truncate">{formatCurrency(totalGecikti)}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Müşteri ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="flex h-10 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="TUMU">Tüm Durumlar</option>
          <option value="BEKLIYOR">Bekliyor</option>
          <option value="ODENDI">Ödendi</option>
          <option value="GECIKTI">Gecikti</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-500">Bu dönem için tahsilat kaydı yok</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {groupedByOrder.map((p: any) => {
            const isEditing = inlineEditingId === p.id
            const totalPaid = p.totalPaid ?? 0
            const remaining = p.remainingDebt ?? 0

            return (
              <Card key={p.id} className={p.status === 'GECIKTI' ? 'border-red-200' : 'hover:shadow-md transition-all'}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="bg-blue-100 p-2.5 rounded-xl shrink-0 shadow-sm border border-blue-200">
                        <CreditCard className="h-5 w-5 text-blue-700" />
                      </div>
                      <div className="min-w-0 group cursor-pointer flex-1" onClick={() => {
                        setInlineEditingId(p.id)
                        setEditForm({
                          amount: Number(totalPaid.toFixed(2)).toString(), 
                          method: p.method || 'NAKIT',
                          notes: p.notes || '',
                          dueDate: p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : ''
                        })
                      }}>
                        <div className="text-sm uppercase font-bold text-slate-800 leading-none tracking-tight flex items-center gap-2">
                          {p.order?.customer?.user?.name}
                          <Edit3 className="h-3 w-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-all duration-200" />
                        </div>
                        <div className="text-[12px] text-slate-600 font-medium flex flex-wrap gap-x-2 mt-1.5">
                          {p.order && (
                            <>
                              <span className="bg-slate-50 px-1 border border-slate-100 rounded text-slate-700">
                                Sipariş: {formatDate(p.order.orderDate || p.order.createdAt)}
                              </span>
                              {(() => {
                                 const orderDate = p.order.orderDate || p.order.createdAt;
                                 const graceDate = new Date(new Date(orderDate).getTime() + (15 * 24 * 60 * 60 * 1000));
                                 return (
                                   <span className="bg-amber-50/30 px-1 rounded border border-amber-100/50 text-amber-700">
                                     • Vade: {formatDate(graceDate)}
                                   </span>
                                 )
                              })()}
                            </>
                          )}
                        </div>
                        {/* Sipariş İçeriği (Neyin karşılığı olduğu) */}
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {p.order?.orderItems?.map((item: any, idx: number) => (
                            <span key={idx} className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100 flex items-center gap-1 leading-none">
                              <span className="font-bold text-slate-800">{item.quantity}x</span>
                              {item.product?.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 shrink-0">
                      {/* Ödeme Özeti */}
                      <div className="text-right flex flex-col justify-center min-w-[160px] gap-1">
                        <div className="flex items-center justify-end gap-2 text-slate-500">
                          <span className="text-[10px] font-bold uppercase">Toplam:</span>
                          <span className="text-sm font-bold">{formatCurrency(p.totalDebt || p.amount)}</span>
                        </div>
                        
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-extrabold text-blue-600 uppercase leading-none">Tahsil Edilen</span>
                          <div className="flex items-center justify-end h-9">
                            {isEditing ? (
                              <div className="flex items-center justify-end animate-in fade-in duration-200 gap-2">
                                <div className="flex items-center text-slate-900 border-b-2 border-blue-600 pb-0.5">
                                  <span className="text-xl font-black mr-0.5 tracking-tighter">₺</span>
                                  <input
                                    type="text"
                                    className="w-24 bg-transparent border-none outline-none font-black text-xl text-slate-900 tracking-tighter p-0 text-right focus:ring-0 focus:outline-none"
                                    value={editForm.amount}
                                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                                    onBlur={() => handleUpdateTotalCollected(p)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleUpdateTotalCollected(p)
                                      if (e.key === 'Escape') cancelInlineEdit()
                                    }}
                                    autoFocus
                                  />
                                </div>
                                <button 
                                  onClick={() => handleUpdateTotalCollected(p)}
                                  className="bg-green-500 hover:bg-green-600 text-white p-1 rounded-full shadow-sm transition-all"
                                >
                                  <Check className="h-4 w-4 stroke-[3px]" />
                                </button>
                              </div>
                            ) : (
                              <div 
                                className="cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-lg transition-all group flex items-center h-full"
                                onClick={() => {
                                  setInlineEditingId(p.id)
                                  setEditForm({
                                    amount: Number(totalPaid.toFixed(2)).toString(), 
                                    method: p.method || 'NAKIT',
                                    notes: p.notes || '',
                                    dueDate: p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : ''
                                  })
                                }}
                              >
                                <Edit3 className="h-3 w-3 mr-2 text-blue-500 opacity-0 group-hover:opacity-100 transition-all font-bold" />
                                <span className="text-xl font-black text-slate-900 tracking-tighter">
                                  {totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  <span className="text-sm ml-0.5 font-bold">₺</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-1 mt-1 border-t border-slate-100 flex items-center justify-end gap-2">
                          <span className={`text-[10px] font-black uppercase ${remaining > 0.01 ? 'text-red-500' : 'text-green-600'}`}>
                            {remaining > 0.01 ? 'Kalan Borç:' : 'Bakiye Kapandı'}
                          </span>
                          {remaining > 0.01 && (
                            <span className="text-sm font-black text-red-600 tracking-tight">
                              {formatCurrency(remaining)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Durum ve Aksiyonlar */}
                      <div className="flex flex-col items-center gap-2 min-w-[90px]">
                        {(() => {
                           const isPaid = remaining < 0.01;
                           const orderDate = p.order?.orderDate || p.order?.createdAt;
                           const graceDate = orderDate ? new Date(new Date(orderDate).getTime() + (15 * 24 * 60 * 60 * 1000)) : null;
                           const today = new Date();
                           const isGecikti = !isPaid && graceDate && today > graceDate;
                           
                           return (
                             <>
                               <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded border ${
                                 isPaid ? 'bg-green-50 border-green-200 text-green-700' : 
                                 isGecikti ? 'bg-red-50 border-red-200 text-red-700' : 
                                 'bg-amber-50 border-amber-200 text-amber-700'
                               }`} title={isPaid ? 'Ödeme Tamamlandı' : isGecikti ? 'Vade Geçti' : 'Ödeme Bekleniyor'}>
                                 {isPaid ? 'Ödendi' : isGecikti ? 'Gecikti' : 'Bekliyor'}
                               </span>
                               <div className="flex gap-1.5 mt-2">
                                 {!isPaid && !isEditing ? (
                                   <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-[10px] font-extrabold px-3 shadow-sm" onClick={() => markPaid(p.id)}>ÖDENDİ</Button>
                                 ) : isPaid && !isEditing && (
                                   <Button size="sm" variant="outline" className="h-7 text-[9px] font-black border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all bg-white" 
                                     onClick={() => {
                                       setConfirmAction({
                                         message: 'Tahsilatı iptal edip borcu tekrar beklemeye almak istediğinize emin misiniz?',
                                         onConfirm: () => revertToPending(p.id)
                                       })
                                     }}>
                                     GERİ AL
                                     </Button>
                                 )}
                               </div>
                             </>
                           )
                        })()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              Tahsilat Kaydını Sil
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">{confirmAction?.message}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)} className="flex-1">Vazgeç</Button>
            <Button variant="destructive" onClick={() => confirmAction?.onConfirm()} className="flex-1">Evet, Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
