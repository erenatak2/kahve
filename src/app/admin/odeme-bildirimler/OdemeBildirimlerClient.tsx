'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CheckCircle, XCircle, Clock, Building2, User, FileImage } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface PaymentNotification {
  id: string
  amount: number
  bankName: string | null
  senderName: string | null
  receiptUrl: string | null
  notes: string | null
  status: string
  adminNotes: string | null
  createdAt: string
  order: {
    id: string
    orderNumber: string | null
    totalAmount: number
    customer: {
      user: {
        name: string
        email: string
      }
    }
  }
}

interface OdemeBildirimlerClientProps {
  initialNotifications: PaymentNotification[]
  session: any
}

export default function OdemeBildirimlerClient({ initialNotifications, session }: OdemeBildirimlerClientProps) {
  const [notifications, setNotifications] = useState<PaymentNotification[]>(initialNotifications)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<PaymentNotification | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  const fetchNotifications = () => {
    fetch('/api/admin/odeme-bildirimler')
      .then(r => r.json())
      .then(d => setNotifications(d))
  }

  const handleAction = async (id: string, status: 'ONAYLANDI' | 'REDDEDILDI') => {
    setProcessing(true)
    const res = await fetch('/api/admin/odeme-bildirimler', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, adminNotes })
    })
    if (res.ok) {
      toast({ 
        title: status === 'ONAYLANDI' ? 'Ödeme onaylandı' : 'Ödeme reddedildi',
        description: 'Tahsilat durumu güncellendi'
      })
      setSelected(null)
      setAdminNotes('')
      fetchNotifications()
    } else {
      toast({ title: 'İşlem başarısız', variant: 'destructive' })
    }
    setProcessing(false)
  }

  const bekleyen = notifications.filter(n => n.status === 'BEKLIYOR')
  const onaylanan = notifications.filter(n => n.status === 'ONAYLANDI')
  const reddedilen = notifications.filter(n => n.status === 'REDDEDILDI')

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Ödeme Bildirimleri</h1>
          <p className="text-gray-500 text-sm">Müşterilerin havale/EFT bildirimleri</p>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-4 pb-4 px-3 md:pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-yellow-600" />
              <span className="text-xs md:text-sm text-yellow-700 font-medium">Bekliyor</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-yellow-800 mt-1">{bekleyen.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 pb-4 px-3 md:pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              <span className="text-xs md:text-sm text-green-700 font-medium">Onaylandı</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-green-800 mt-1">{onaylanan.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4 pb-4 px-3 md:pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
              <span className="text-xs md:text-sm text-red-700 font-medium">Reddedildi</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-red-800 mt-1">{reddedilen.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bildirim Listesi */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Henüz ödeme bildirimi yok
            </CardContent>
          </Card>
        ) : (
          notifications.map(n => (
            <Card key={n.id} className={cn(
              "overflow-hidden transition-all border-l-4",
              n.status === 'BEKLIYOR' ? 'border-yellow-400 bg-yellow-50/20' : 
              n.status === 'ONAYLANDI' ? 'border-green-400 bg-white' : 
              'border-red-400 bg-white opacity-75'
            )}>
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-900">{formatCurrency(n.amount)}</span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-black uppercase",
                        n.status === 'BEKLIYOR' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                        n.status === 'ONAYLANDI' ? 'bg-green-100 text-green-700 border border-green-200' :
                        'bg-red-100 text-red-700 border border-red-200'
                      )}>
                        {n.status === 'BEKLIYOR' ? 'Bekliyor' : n.status === 'ONAYLANDI' ? 'Onaylandı' : 'Reddedildi'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <User className="h-3.5 w-3.5 text-blue-500" />
                        {n.order.customer.user.name}
                      </span>
                      <span className="flex items-center gap-1.5 italic">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {n.bankName || '-'}
                      </span>
                      {n.receiptUrl && (
                        <a 
                          href={n.receiptUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold underline decoration-blue-200 underline-offset-4"
                        >
                          <FileImage className="h-3.5 w-3.5" />
                          Dekontu Görüntüle
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Sipariş: {n.order.orderNumber}</span>
                      <span>•</span>
                      <span>{formatDate(n.createdAt)}</span>
                    </div>
                    {n.adminNotes && (
                      <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100 italic text-xs text-slate-500">
                        <b>Admin notu:</b> {n.adminNotes}
                      </div>
                    )}
                  </div>
                  {n.status === 'BEKLIYOR' && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => setSelected(n)}>
                        <CheckCircle className="h-4 w-4 mr-1.5" />
                        Onayla
                      </Button>
                      <Button size="sm" variant="destructive" className="font-bold" onClick={() => setSelected({ ...n, status: 'REDDET' } as any)}>
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Reddet
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setAdminNotes('') }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.status === 'REDDET' ? <XCircle className="h-5 w-5 text-red-600" /> : <CheckCircle className="h-5 w-5 text-green-600" />}
              {selected?.status === 'REDDET' ? 'Ödemeyi Reddet' : 'Ödemeyi Onayla'}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {selected && (
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-900">
                  <div className="flex justify-between"><span>Müşteri:</span><b>{selected.order.customer.user.name}</b></div>
                  <div className="flex justify-between"><span>Tutar:</span><b className="text-lg text-blue-700">{formatCurrency(selected.amount)}</b></div>
                  <div className="flex justify-between"><span>Sipariş:</span><b>{selected.order.orderNumber}</b></div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <label className="text-sm font-bold text-slate-700">İşlem Notu (Müşteriye de görünür)</label>
            <Input 
              placeholder={selected?.status === 'REDDET' ? "Reddetme sebebini yazın..." : "Onay notu yazın (opsiyonel)..."}
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              className="h-11"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setSelected(null); setAdminNotes('') }} className="flex-1">İptal</Button>
            <Button 
              variant={selected?.status === 'REDDET' ? 'destructive' : 'default'}
              onClick={() => handleAction(selected!.id, selected?.status === 'REDDET' ? 'REDDEDILDI' : 'ONAYLANDI')}
              disabled={processing}
              className={cn("flex-[2] font-bold", selected?.status !== 'REDDET' && 'bg-green-600 hover:bg-green-700')}
            >
              {processing ? 'İşleniyor...' : selected?.status === 'REDDET' ? 'Harcamayı Reddet' : 'Ödemeyi Onayla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}
