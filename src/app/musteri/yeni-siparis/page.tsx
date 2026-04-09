'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { ShoppingCart, Plus, Minus, Trash2, Search, ShoppingBag } from 'lucide-react'

export default function YeniSiparis() {
  const [products, setProducts] = useState<any[]>([])
  const [cart, setCart] = useState<{ productId: string; quantity: number; unitPrice: number; name: string }[]>([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Tümü')
  const [search, setSearch] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showCartSidebar, setShowCartSidebar] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetch('/api/urunler').then(r => r.json()).then(d => { setProducts(d); setLoading(false) })
    
    // localStorage'dan sepeti yükle
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]')
    setCart(savedCart)
  }, [])

  const categories = ['Tümü', ...Array.from(new Set(products.map((p: any) => p.category).filter(Boolean)))]
  const filtered = products.filter((p: any) => {
    const catMatch = activeCategory === 'Tümü' || p.category === activeCategory
    const searchMatch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return catMatch && searchMatch && p.stock > 0
  })

  const openAddDialog = (p: any) => {
    setSelectedProduct(p)
    setSelectedQuantity(1) // Her zaman 1'den başla
    setShowAddDialog(true)
  }

  const confirmAddToCart = () => {
    if (!selectedProduct) return
    const newItem = { 
      productId: selectedProduct.id, 
      quantity: selectedQuantity, 
      unitPrice: selectedProduct.customerPrice ?? selectedProduct.salePrice, 
      name: selectedProduct.name, 
      imageUrl: selectedProduct.imageUrl,
      maxStock: selectedProduct.stock 
    }
    
    setCart(prev => {
      const existing = prev.find(i => i.productId === selectedProduct.id)
      let updatedCart
      if (existing) {
        // Mevcut miktara seçilen miktarı EKLE
        const newQuantity = existing.quantity + selectedQuantity
        updatedCart = prev.map(i => i.productId === selectedProduct.id ? { ...i, quantity: newQuantity } : i)
        console.log(`➕ Ekleme: ${existing.quantity} + ${selectedQuantity} = ${newQuantity}`)
      } else {
        updatedCart = [...prev, newItem]
        console.log(`🆕 İlk ekleme: ${selectedQuantity} adet`)
      }
      localStorage.setItem('cart', JSON.stringify(updatedCart))
      console.log('✅ Sepete eklendi - localStorage:', JSON.stringify(updatedCart, null, 2))
      // Custom event dispatch et ki diğer sayfalar güncellensin
      window.dispatchEvent(new Event('storage'))
      return updatedCart
    })
    
    setShowAddDialog(false)
    const { dismiss } = toast({ title: 'Sepete eklendi' })
    setTimeout(() => dismiss(), 800)
  }

  const updateQty = (productId: string, qty: number) => {
    setCart(prev => {
      let updatedCart
      if (qty <= 0) {
        updatedCart = prev.filter(i => i.productId !== productId)
      } else {
        const product = products.find((p: any) => p.id === productId)
        const maxQty = product?.stock ?? qty
        updatedCart = prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i)
      }
      localStorage.setItem('cart', JSON.stringify(updatedCart))
      window.dispatchEvent(new Event('storage'))
      return updatedCart
    })
  }

  const openConfirmDialog = () => {
    if (cart.length === 0) return toast({ title: 'Sepete ürün ekleyin', variant: 'destructive' })
    setShowConfirmDialog(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setShowConfirmDialog(false)
    const res = await fetch('/api/siparisler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })), notes }),
    })
    if (res.ok) {
      toast({ title: 'Siparişiniz alındı!' })
      router.push('/musteri/siparisler')
    } else {
      const err = await res.json().catch(() => ({}))
      toast({ title: 'Sipariş verilemedi', description: err.error || 'Bir hata oluştu', variant: 'destructive' })
    }
    setSubmitting(false)
  }

  const total = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Ürünler</h1>
        <p className="text-gray-500 text-sm">Ürünleri seçerek sepetinize ekleyin</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
      ) : (
        <>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input className="pl-9 h-9 text-sm" placeholder="Ürün ara..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">Ürün bulunamadı</div>
          )}

          {/* Trendyol tarzı Floating Sepet Butonu */}
          {cart.length > 0 && (
            <button
              onClick={() => router.push('/musteri/sepet')}
              className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-3 shadow-lg hover:shadow-xl transition-all z-40 flex items-center gap-2"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="font-medium text-sm">Sepetim</span>
              <span className="bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 font-bold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </button>
          )}

          <div className="space-y-2">
            {filtered.map((p: any) => {
              const cartItem = cart.find(i => i.productId === p.id)
              const price = p.customerPrice ?? p.salePrice
              return (
                <Card
                  key={p.id}
                  className="relative overflow-hidden border-gray-200"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {p.code && (
                        <span className="text-xs font-bold text-gray-600 w-12 shrink-0 text-center leading-tight">{p.code}</span>
                      )}
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-16 w-16 object-contain rounded border bg-white shrink-0" />
                      ) : (
                        <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400 shrink-0">No Img</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-tight">{p.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.category}</p>
                        <p className="text-blue-600 font-bold text-sm mt-1">{formatCurrency(price * 1.2)}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => openAddDialog(p)}
                        className="h-9 text-xs shrink-0 px-6 bg-blue-600 hover:bg-blue-700 text-white"
                        variant={cartItem ? "default" : "outline"}
                      >
                        Sepete Ekle
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Cart Sidebar */}
      {showCartSidebar && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowCartSidebar(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Sepetim ({cart.length} ürün)
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCartSidebar(false)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map(item => (
                <Card key={item.productId}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatCurrency(item.unitPrice * 1.2)} × {item.quantity}</p>
                      </div>
                      <p className="font-bold text-blue-600">{formatCurrency(item.unitPrice * 1.2 * item.quantity)}</p>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQty(item.productId, item.quantity - 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQty(item.productId, item.quantity + 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateQty(item.productId, 0)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="p-4 border-t space-y-3 bg-gray-50">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Toplam:</span>
                <div className="text-right">
                  <span className="text-xl font-bold text-blue-600">{formatCurrency(total * 1.2)}</span>
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">KDV DAHİL</p>
                </div>
              </div>
              <Input
                placeholder="Sipariş notu (isteğe bağlı)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="text-sm"
              />
              <Button 
                onClick={() => { setShowCartSidebar(false); openConfirmDialog() }} 
                disabled={submitting} 
                className="w-full"
              >
                {submitting ? 'Gönderiliyor...' : `Sipariş Ver (${formatCurrency(total * 1.2)})`}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Add to Cart Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sepete Ekle</DialogTitle>
            <DialogDescription>Ürün miktarını seçerek sepetinize ekleyin</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {selectedProduct.imageUrl ? (
                  <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="h-20 w-20 object-contain rounded border bg-white" />
                ) : (
                  <div className="h-20 w-20 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">No Img</div>
                )}
                <div>
                  <p className="font-semibold">{selectedProduct.name}</p>
                  <p className="text-sm text-gray-500">{selectedProduct.category}</p>
                  <p className="text-lg font-bold text-blue-600 mt-1">{formatCurrency((selectedProduct.customerPrice ?? selectedProduct.salePrice) * 1.2)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Miktar</label>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newQty = selectedQuantity + 1
                      console.log('➕ Plus tıklandı - Eski:', selectedQuantity, 'Yeni:', newQty)
                      setSelectedQuantity(newQty)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-500">{selectedProduct.unit ? `/ ${selectedProduct.unit}` : ''}</span>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="flex justify-between text-sm">
                  <span>Toplam (KDV Dahil):</span>
                  <span className="font-bold text-blue-600">{formatCurrency((selectedProduct.customerPrice ?? selectedProduct.salePrice) * 1.2 * selectedQuantity)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>İptal</Button>
            <Button onClick={confirmAddToCart}>Sepete Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Siparişi Onayla</DialogTitle>
            <DialogDescription>Sipariş detaylarını kontrol edin ve onaylayın</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Siparişinizi onaylıyor musunuz?</p>
            <div className="border rounded-lg divide-y">
              {cart.map(item => (
                <div key={item.productId} className="p-3 flex justify-between text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.quantity} adet × {formatCurrency(item.unitPrice * 1.2)}</p>
                  </div>
                  <p className="font-semibold text-blue-600">{formatCurrency(item.unitPrice * 1.2 * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div className="flex justify-between items-center text-blue-800">
                <span className="font-bold">GENEL TOPLAM:</span>
                <span className="text-2xl font-black">{formatCurrency(total * 1.2)}</span>
              </div>
              <p className="text-[10px] text-center mt-1 text-blue-600 font-bold uppercase tracking-wider">TÜM FİYATLAR KDV DAHİLDİR</p>
            </div>
            {notes && (
              <div className="text-sm border-t pt-2">
                <p className="font-medium text-gray-700">Sipariş Notu:</p>
                <p className="text-gray-600 mt-1">{notes}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={submitting}>İptal</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Gönderiliyor...' : 'Siparişi Onayla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
