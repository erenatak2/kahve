'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { Package, Search } from 'lucide-react'

export default function MusteriUrunler() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Tümü')

  useEffect(() => {
    fetch('/api/urunler')
      .then(r => r.json())
      .then(d => { setProducts(d); setLoading(false) })
  }, [])

  const categories = ['Tümü', ...Array.from(new Set(products.map((p: any) => p.category).filter(Boolean)))]

  const filtered = products.filter((p: any) => {
    const catMatch = activeCategory === 'Tümü' || p.category === activeCategory
    const searchMatch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return catMatch && searchMatch
  })

  const getStockInfo = (p: any) => {
    if (p.stock <= 0) return { label: 'Tükendi', color: 'text-red-500 bg-red-50', dot: 'bg-red-400' }
    if (p.stock <= p.minStock) return { label: `${p.stock} ${p.unit} (Az)`, color: 'text-orange-600 bg-orange-50', dot: 'bg-orange-400' }
    return { label: `${p.stock} ${p.unit}`, color: 'text-green-700 bg-green-50', dot: 'bg-green-400' }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ürün Kataloğu</h1>
          <p className="text-gray-500 text-sm">{products.length} ürün</p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded mt-1">Fiyatlar KDV hariçtir</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          <div className="relative">
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

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Ürün bulunamadı</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((p: any) => {
                const stockInfo = getStockInfo(p)
                const hasSpecialPrice = p.customerPrice != null && p.customerPrice !== p.salePrice
                const displayPrice = p.customerPrice ?? p.salePrice
                const hasDiscount = p.discountRate && p.discountRate > 0
                return (
                  <Card key={p.id} className={p.stock <= 0 ? 'opacity-60' : ''}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {p.code && (
                            <span className="text-xs font-bold text-gray-600 w-14 shrink-0 text-center">{p.code}</span>
                          )}
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="h-14 w-14 object-contain rounded-lg border bg-white shrink-0" />
                          ) : (
                            <div className="bg-blue-50 h-14 w-14 rounded-lg shrink-0 flex items-center justify-center">
                              <Package className="h-6 w-6 text-blue-600" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.category}{p.unit ? ` • ${p.unit}` : ''}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${stockInfo.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${stockInfo.dot}`} />
                                {stockInfo.label}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-base text-blue-600">{formatCurrency(displayPrice)}</p>
                          {hasSpecialPrice && (
                            <p className="text-xs text-gray-400 line-through">{formatCurrency(p.salePrice)}</p>
                          )}
                          {hasDiscount && p.discountRate > 0 && (
                            <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">%{p.discountRate} İndirim</span>
                          )}
                          {!hasDiscount && hasSpecialPrice && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Özel Fiyat</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
