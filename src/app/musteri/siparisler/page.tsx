'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate, ORDER_STATUS, ORDER_STATUS_COLOR, PAYMENT_STATUS_COLOR } from '@/lib/utils'
import { ShoppingCart, ChevronDown, ChevronUp, RefreshCw, X, AlertTriangle, Plus, CreditCard, Package, CheckCircle, Clock } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MusteriSiparisler() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showCancelled, setShowCancelled] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [paymentDialog, setPaymentDialog] = useState<{ order: any; bankName: string; senderName: string; notes: string; receiptUrl: string | null } | null>(null)
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const fetchOrders = () => {
    fetch('/api/siparisler').then(r => r.json()).then(d => { setOrders(d); setLoading(false) })
  }

  useEffect(() => { fetchOrders() }, [])

  const addToCart = (order: any) => {
    // Mevcut sepeti al
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]')
    
    // Sipariş ürünlerini sepete ekle
    const newItems = order.orderItems.map((item: any) => ({
      productId: item.productId,
      name: item.product?.name || 'Ürün',
      imageUrl: item.product?.imageUrl,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      code: item.product?.code
    }))
    
    // Sepeti güncelle
    localStorage.setItem('cart', JSON.stringify([...existingCart, ...newItems]))
    
    toast({ 
      title: 'Sepete Eklendi', 
      description: `${newItems.length} ürün sepetinize eklendi.`,
      action: (
        <Button 
          size="sm" 
          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
          onClick={() => router.push('/musteri/yeni-siparis')}
        >
          Sepete Git
        </Button>
      )
    })
  }

  const cancelOrder = (order: any) => {
    setConfirmAction({
      message: `Sipariş ${order.orderNumber || order.id.slice(-8).toUpperCase()} iptal edilecek. Bu işlem geri alınamaz.`,
      onConfirm: async () => {
        const res = await fetch(`/api/siparisler/${order.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'IPTAL' }),
        })
        if (res.ok) { toast({ title: 'Sipariş iptal edildi' }); fetchOrders() }
        else {
          const err = await res.json().catch(() => ({}))
          toast({ title: 'İptal edilemedi', description: err.error || 'Bir hata oluştu', variant: 'destructive' })
        }
        setConfirmAction(null)
      }
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      if (res.ok) {
        const data = await res.json()
        setPaymentDialog(prev => prev ? { ...prev, receiptUrl: data.url } : null)
        toast({ title: 'Dekont yüklendi' })
      } else {
        toast({ title: 'Yükleme başarısız', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Yükleme başarısız', variant: 'destructive' })
    }
    setUploadingFile(false)
  }

  const submitPaymentNotification = async () => {
    if (!paymentDialog) return
    setSubmittingPayment(true)
    const res = await fetch('/api/odeme-bildirim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: paymentDialog.order.id,
        amount: paymentDialog.order.totalAmount,
        bankName: paymentDialog.bankName,
        senderName: paymentDialog.senderName,
        notes: paymentDialog.notes,
        receiptUrl: paymentDialog.receiptUrl
      })
    })
    if (res.ok) {
      toast({ title: 'Ödeme bildirimi gönderildi', description: 'Admin onayı bekleniyor', duration: 300 })
      setPaymentDialog(null)
    } else {
      toast({ title: 'Gönderilemedi', variant: 'destructive' })
    }
    setSubmittingPayment(false)
  }

  const activeOrders = orders.filter((o: any) => o.status !== 'IPTAL')
  const cancelledOrders = orders.filter((o: any) => o.status === 'IPTAL')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Siparişlerim</h1>
        <p className="text-gray-500 text-sm">{activeOrders.length} aktif sipariş</p>
      </div>

      {cancelledOrders.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCancelled(!showCancelled)}
          className="w-full"
        >
          {showCancelled ? 'İptal Edilenleri Gizle' : `İptal Edilen Siparişler (${cancelledOrders.length})`}
        </Button>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Henüz sipariş yok</p>
            <Link href="/musteri/urunler">
              <Button className="mt-4" size="sm">Ürünleri İncele</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Aktif Siparişler */}
          {activeOrders.map((o: any) => {
            const isExpanded = expanded === o.id
            const paidAmount = o.payments?.filter((p: any) => p.status === 'ODENDI').reduce((s: number, p: any) => s + p.amount, 0) || 0
            return (
              <Card key={o.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    {/* Sol: Ürün Resmi */}
                    <div className="shrink-0">
                      {o.orderItems?.[0]?.product?.imageUrl ? (
                        <img 
                          src={o.orderItems[0].product.imageUrl} 
                          alt={o.orderItems[0].product?.name} 
                          className="h-16 w-16 object-contain rounded-lg border bg-white" 
                        />
                      ) : (
                        <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">
                          <ShoppingCart className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    
                    {/* Orta: Ürün Bilgileri */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {o.orderItems?.[0]?.product?.name}
                        {o.orderItems?.length > 1 && ` +${o.orderItems.length - 1} ürün`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Sipariş No: {o.orderNumber || o.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(o.createdAt)}
                      </p>
                    </div>
                    
                    {/* Sağ: Tutar ve Durum */}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">{formatCurrency(o.totalAmount)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${ORDER_STATUS_COLOR[o.status] || 'bg-gray-100'}`}>
                        {ORDER_STATUS[o.status] || o.status}
                      </span>
                    </div>
                  </div>
                  
                    {/* Alt: Butonlar */}
                  <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
                                        {(() => {
                      const payment = o.payments?.[0]
                      const notification = o.paymentNotifications?.[0]
                      if (payment?.status === 'ODENDI') {
                        return (
                          <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Ödemeniz Onaylandı
                          </span>
                        )
                      }
                      if (payment?.status === 'BEKLIYOR' && notification?.status === 'BEKLIYOR') {
                        return (
                          <span className="text-sm text-yellow-600 flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Ödeme Onayı Bekleniyor
                          </span>
                        )
                      }
                      if (payment?.status === 'BEKLIYOR') {
                        return (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => setPaymentDialog({ order: o, bankName: '', senderName: '', notes: '', receiptUrl: null })}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Ödeme Yaptım
                          </Button>
                        )
                      }
                      return null
                    })()}
                    {o.status === 'HAZIRLANIYOR' && (
                      <Button variant="outline" size="sm" onClick={() => cancelOrder(o)} className="text-red-600 border-red-200 hover:bg-red-50">
                        <X className="h-4 w-4 mr-1" />
                        İptal Et
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setExpanded(isExpanded ? null : o.id)}>
                      Detaylar
                      {isExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t">
                      {/* Ürün Detayları */}
                      {o.orderItems?.map((item: any) => (
                        <div key={item.id} className="py-3 border-b last:border-0">
                          <p className="text-sm font-medium text-gray-900">{item.product?.name}</p>
                          <div className="flex justify-between items-center mt-2 text-sm">
                            <span className="text-gray-500">{formatCurrency(item.unitPrice)} × {item.quantity} adet</span>
                            <span className="font-semibold text-gray-900">{formatCurrency(item.total)}</span>
                          </div>
                        </div>
                      ))}

                      {/* Toplam */}
                      <div className="flex justify-between items-center py-3 text-lg font-bold">
                        <span>Toplam</span>
                        <span>{formatCurrency(o.totalAmount)}</span>
                      </div>

                      {/* Ödeme & Kargo - Mobilde alt alta */}
                      <div className="space-y-2 pt-3 border-t text-sm">
                        {o.payments?.length > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Ödeme Durumu</span>
                            {o.payments.map((pay: any) => (
                              <span key={pay.id} className={pay.status === 'ODENDI' ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
                                {pay.status === 'ODENDI' ? 'Ödendi' : 'Bekliyor'} ({formatCurrency(pay.amount)})
                              </span>
                            ))}
                          </div>
                        )}
                        {(o.cargoCompany || o.trackingNumber) && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Kargo</span>
                            <span className="text-gray-700">{o.cargoCompany || '-'} {o.trackingNumber && `(${o.trackingNumber})`}</span>
                          </div>
                        )}
                      </div>

                      {o.notes && (
                        <p className="text-xs text-gray-500 mt-3 pt-3 border-t">
                          Not: {o.notes}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {/* İptal Edilen Siparişler - Göster/Gizle */}
          {showCancelled && cancelledOrders.length > 0 && (
            <>
              <div className="border-t pt-4 mt-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">İptal Edilen Siparişler</h2>
              </div>
              {cancelledOrders.map((o: any) => {
                const isExpanded = expanded === o.id
                return (
                  <Card key={o.id} className="opacity-60">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{formatDate(o.createdAt)}</p>
                          <p className="text-xs text-gray-500">{o.orderItems?.length} ürün kalemi</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-bold text-sm">{formatCurrency(o.totalAmount)}</p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                            İptal
                          </span>
                          <Button variant="outline" size="sm" onClick={() => addToCart(o)} title="Tekrar sipariş ver" className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50">
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline text-xs">Tekrar</span>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setExpanded(isExpanded ? null : o.id)}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 border-t pt-3 space-y-1.5">
                          {o.orderItems?.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between text-sm py-1">
                              <div className="flex items-center gap-2">
                                {item.product?.imageUrl ? (
                                  <img src={item.product.imageUrl} alt={item.product?.name} className="h-10 w-10 object-contain rounded border bg-white" />
                                ) : (
                                  <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400">No Img</div>
                                )}
                                <span className="text-gray-700">{item.product?.name} <span className="text-gray-400">x{item.quantity}</span></span>
                              </div>
                              <span className="font-medium">{formatCurrency(item.total)}</span>
                            </div>
                          ))}
                          <div className="border-t pt-2 mt-2 flex justify-between text-sm font-bold">
                            <span>Toplam</span>
                            <span>{formatCurrency(o.totalAmount)}</span>
                          </div>
                          {o.notes && <p className="text-xs text-gray-500 mt-1">Not: {o.notes}</p>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </>
          )}
        </div>
      )}
      {/* İptal Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="bg-red-100 p-2.5 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <span className="text-lg">Siparişi İptal Et</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-base text-gray-700">{confirmAction?.message}</p>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setConfirmAction(null)} className="flex-1 py-5">
              Vazgeç
            </Button>
            <Button 
              variant="destructive"
              onClick={() => confirmAction?.onConfirm()} 
              className="flex-1 py-5"
            >
              Evet, İptal Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ödeme Bildirim Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ödeme Bildirimi</DialogTitle>
            <DialogDescription>
              Havale/EFT yaptıysanız bilgileri giriniz
            </DialogDescription>
          </DialogHeader>
          {paymentDialog && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p><span className="font-medium">Sipariş:</span> {paymentDialog.order.orderNumber}</p>
                <p><span className="font-medium">Tutar:</span> {formatCurrency(paymentDialog.order.totalAmount)}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Dekont</label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="flex-1"
                  />
                  {uploadingFile && <span className="text-sm text-gray-500">Yükleniyor...</span>}
                </div>
                {paymentDialog.receiptUrl && (
                  <p className="text-xs text-green-600">✓ Dekont yüklendi</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(null)}>İptal</Button>
            <Button 
              onClick={submitPaymentNotification}
              disabled={submittingPayment}
              className="bg-green-600 hover:bg-green-700"
            >
              {submittingPayment ? 'Gönderiliyor...' : 'Gönder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
