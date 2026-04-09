'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { ShoppingBasket, Trash2, Plus, Minus, ShoppingCart, CheckCircle, AlertCircle } from 'lucide-react'
import { SIRKET_BILGILERI } from '@/lib/sirket-bilgileri'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

interface CartItem {
  productId: string
  name: string
  imageUrl?: string
  quantity: number
  unitPrice: number
  code?: string
}

export default function SepetPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)
  const [orderPlaced, setOrderPlaced] = useState<{ orderNumber?: string; total: number } | null>(null)
  const [billingAddress, setBillingAddress] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [sameAddress, setSameAddress] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState('HAVALE')
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetch('/api/musteri/profil').then(r => r.json()).then(d => {
      if (d.address) {
        const fullAddr = [d.address, d.city].filter(Boolean).join(', ')
        setBillingAddress(fullAddr)
        setShippingAddress(fullAddr)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const loadCart = () => {
      const savedCart = JSON.parse(localStorage.getItem('cart') || '[]')
      setCart(savedCart)
    }
    
    loadCart()
    
    // Başka sayfalardan sepete ürün eklenince güncelle
    const handleStorageChange = () => {
      loadCart()
      setRefreshKey(prev => prev + 1)
    }
    window.addEventListener('storage', handleStorageChange)
    
    // Sayfa her açıldığında yenile
    const handleFocus = () => loadCart()
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [refreshKey])

  const updateCart = (newCart: CartItem[]) => {
    setCart(newCart)
    localStorage.setItem('cart', JSON.stringify(newCart))
  }

  const updateQuantity = (productId: string, delta: number) => {
    const newCart = cart.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta)
        return { ...item, quantity: newQty }
      }
      return item
    })
    updateCart(newCart)
  }

  const removeItem = (productId: string) => {
    setRemoveTarget(productId)
  }

  const confirmRemove = () => {
    if (!removeTarget) return
    const newCart = cart.filter(item => item.productId !== removeTarget)
    updateCart(newCart)
    setRemoveTarget(null)
    toast({ title: 'Ürün sepetten kaldırıldı' })
  }

  const clearCart = () => {
    updateCart([])
    toast({ title: 'Sepet temizlendi' })
  }

  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  const handleOrder = () => {
    if (cart.length === 0) {
      toast({ title: 'Sepetiniz boş', variant: 'destructive' })
      return
    }
    setShowConfirm(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setShowConfirm(false)
    try {
      const res = await fetch('/api/siparisler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
          notes,
          billingAddress,
          shippingAddress: sameAddress ? billingAddress : shippingAddress,
          paymentMethod
        })
      })
      const data = await res.json()
      if (!res.ok) throw data
      localStorage.removeItem('cart')
      setCart([])
      window.dispatchEvent(new Event('storage'))
      setOrderPlaced({ orderNumber: data.orderNumber, total: data.totalAmount })
    } catch (err: any) {
      toast({ title: 'Sipariş verilemedi', description: err.error || 'Bir hata oluştu', variant: 'destructive' })
    }
    setSubmitting(false)
  }

  if (orderPlaced) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-green-800">Siparişiniz alındı!</p>
            {orderPlaced.orderNumber && <p className="text-sm text-green-700">Sipariş No: <span className="font-mono font-semibold">{orderPlaced.orderNumber}</span></p>}
            <p className="text-sm text-green-700">Tutar: <span className="font-semibold">{formatCurrency(orderPlaced.total)}</span></p>
          </div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="font-bold text-amber-800 text-base">ÖDEMENİZİ TAMAMLADINIZ MI?</p>
          </div>
          <p className="text-sm text-amber-700">Siparişinizin işleme alınması için ödemenizi gerçekleştirmeniz gerekmektedir.</p>
          <div className="space-y-3">
            {SIRKET_BILGILERI.banka.map((b, i) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-amber-200 space-y-1">
                <p className="font-semibold text-sm text-gray-800">{b.banka} – {b.subeAd}</p>
                <p className="text-xs text-gray-600">Hesap Adı: <span className="font-medium">{b.hesapAd}</span></p>
                <p className="text-xs font-mono bg-gray-50 px-2 py-1 rounded border text-gray-800 tracking-wider">{b.iban}</p>
              </div>
            ))}
          </div>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push('/musteri/siparisler')}>
            Siparişlerime Git
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sepetim</h1>
          <p className="text-gray-500 text-sm">{cart.length} ürün</p>
        </div>
        {cart.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearCart} className="gap-1 text-red-600">
            <Trash2 className="h-4 w-4" />
            Temizle
          </Button>
        )}
      </div>

      {cart.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-4">Sepetiniz boş</p>
            <Button onClick={() => router.push('/musteri/yeni-siparis')} className="bg-emerald-600 hover:bg-emerald-700">
              Ürünleri Görüntüle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {cart.map((item) => (
              <Card key={item.productId}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-16 w-16 object-contain rounded border bg-white" />
                    ) : (
                      <div className="h-16 w-16 bg-gray-100 rounded flex flex-col items-center justify-center text-xs text-gray-400">
                        <span>Resim</span>
                        <span>Yok</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      {item.code && <p className="text-xs text-gray-500">{item.code}</p>}
                      <p className="text-sm text-gray-600">
                        {formatCurrency(item.unitPrice * 1.2)}
                        <span className="text-[10px] text-green-600 ml-1">KDV Dahil</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => updateQuantity(item.productId, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input 
                        type="number" 
                        value={item.quantity} 
                        readOnly
                        className="w-14 h-8 text-center text-sm p-0" 
                      />
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => updateQuantity(item.productId, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="font-bold text-sm">{formatCurrency((item.unitPrice * 1.2) * item.quantity)}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 w-9 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" 
                      onClick={() => removeItem(item.productId)}
                      title="Ürünü kaldır"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600 font-medium">Toplam (KDV Dahil)</span>
                <span className="text-xl font-bold text-blue-600">{formatCurrency(total * 1.2)}</span>
              </div>
              <Button onClick={handleOrder} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5">
                <ShoppingBasket className="h-4 w-4 mr-2" />
                Sipariş Ver
              </Button>
            </CardContent>
          </Card>
        </>
      )}
      {/* Ürün Silme Onay Dialogu */}
      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ürünü Kaldır</DialogTitle>
            <DialogDescription>
              {cart.find(i => i.productId === removeTarget)?.name} ürününü sepetten kaldırmak istediğinizden emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>İptal</Button>
            <Button variant="destructive" onClick={confirmRemove}>Kaldır</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sipariş Onay Dialogu */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Siparişi Onayla</DialogTitle>
            <DialogDescription>Sipariş detaylarını kontrol edin ve onaylayın</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg divide-y">
              {cart.map(item => (
                <div key={item.productId} className="p-3 flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.quantity} adet × {formatCurrency(item.unitPrice * 1.2)}</p>
                  </div>
                  <p className="font-semibold">{formatCurrency((item.unitPrice * 1.2) * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Toplam (KDV Dahil)</span>
              <span>{formatCurrency(total * 1.2)}</span>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Ödeme Yöntemi</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="HAVALE">Havale / EFT</option>
                <option value="NAKIT">Nakit</option>
                <option value="KREDI_KARTI">Kredi Kartı</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Fatura Adresi</label>
              <Input
                placeholder="Fatura adresi"
                value={billingAddress}
                onChange={e => setBillingAddress(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="sameAddr" checked={sameAddress} onChange={e => setSameAddress(e.target.checked)} />
              <label htmlFor="sameAddr" className="text-xs text-gray-600">Teslimat adresi fatura adresiyle aynı</label>
            </div>
            {!sameAddress && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Teslimat Adresi</label>
                <Input
                  placeholder="Teslimat adresi"
                  value={shippingAddress}
                  onChange={e => setShippingAddress(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}
            <Input
              placeholder="Sipariş notu (isteğe bağlı)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>İptal</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? 'Gönderiliyor...' : 'Siparişi Onayla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
