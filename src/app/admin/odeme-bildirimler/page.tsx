'use client'

import { useEffect, useState } from 'react'
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

export default function OdemeBildirimlerPage() {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PaymentNotification | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  const fetchNotifications = () => {
    fetch('/api/admin/odeme-bildirimler')
      .then(r => r.json())
      .then(d => { setNotifications(d); setLoading(false) })
  }

  useEffect(() => { fetchNotifications() }, [])

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

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ödeme Bildirimleri</h1>
        <p className="text-gray-500">Müşterilerin havale/EFT bildirimleri</p>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-yellow-700">Bekliyor</span>
            </div>
            <p className="text-2xl font-bold text-yellow-800 mt-1">{bekleyen.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700">Onaylandı</span>
            </div>
            <p className="text-2xl font-bold text-green-800 mt-1">{onaylanan.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-700">Reddedildi</span>
            </div>
            <p className="text-2xl font-bold text-red-800 mt-1">{reddedilen.length}</p>
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
            <Card key={n.id} className={n.status === 'BEKLIYOR' ? 'border-yellow-300 bg-yellow-50/30' : n.status === 'ONAYLANDI' ? 'border-green-200' : 'border-red-200'}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatCurrency(n.amount)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        n.status === 'BEKLIYOR' ? 'bg-yellow-100 text-yellow-700' :
                        n.status === 'ONAYLANDI' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {n.status === 'BEKLIYOR' ? 'Bekliyor' : n.status === 'ONAYLANDI' ? 'Onaylandı' : 'Reddedildi'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {n.order.customer.user.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {n.bankName || '-'}
                      </span>
                      {n.receiptUrl && (
                        <a 
                          href={n.receiptUrl} 
                          target="_blank" 
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <FileImage className="h-3.5 w-3.5" />
                          Dekontu Görüntüle
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      Sipariş: {n.order.orderNumber} • {formatDate(n.createdAt)}
                    </p>
                    {n.adminNotes && (
                      <p className="text-xs text-gray-500 italic">Admin notu: {n.adminNotes}</p>
                    )}
                  </div>
                  {n.status === 'BEKLIYOR' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50" onClick={() => setSelected(n)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Onayla
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setSelected({ ...n, status: 'REDDET' } as any)}>
                        <XCircle className="h-4 w-4 mr-1" />
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

      {/* Onay/Reddet Dialog */}
      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setAdminNotes('') }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.status === 'REDDET' ? 'Ödemeyi Reddet' : 'Ödemeyi Onayla'}</DialogTitle>
            <DialogDescription>
              {selected && (
                <div className="space-y-2 mt-2 text-sm">
                  <p><span className="font-medium">Müşteri:</span> {selected.order.customer.user.name}</p>
                  <p><span className="font-medium">Tutar:</span> {formatCurrency(selected.amount)}</p>
                  {selected.receiptUrl && (
                    <a href={selected.receiptUrl} target="_blank" className="text-blue-600 underline block">
                      Dekontu Görüntüle
                    </a>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          {selected?.status === 'REDDET' && (
            <div className="space-y-3 py-4">
              <label className="text-sm font-medium">Reddetme Sebebi (opsiyonel)</label>
              <Input 
                placeholder="Neden reddediyorsunuz..."
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelected(null); setAdminNotes('') }}>İptal</Button>
            <Button 
              variant={selected?.status === 'REDDET' ? 'destructive' : 'default'}
              onClick={() => handleAction(selected!.id, selected?.status === 'REDDET' ? 'REDDEDILDI' : 'ONAYLANDI')}
              disabled={processing}
              className={selected?.status === 'REDDET' ? '' : 'bg-green-600 hover:bg-green-700'}
            >
              {processing ? 'İşleniyor...' : selected?.status === 'REDDET' ? 'Reddet' : 'Onayla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
