'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, ORDER_STATUS, ORDER_STATUS_COLOR, PAYMENT_STATUS_COLOR } from '@/lib/utils'
import { ShoppingCart, CreditCard, Clock, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function MusteriDashboard() {
  const [orders, setOrders] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/siparisler').then(r => r.json()),
      fetch('/api/tahsilat').then(r => r.json()),
    ]).then(([o, p]) => { setOrders(o); setPayments(p); setLoading(false) })
  }, [])

  // Sadece iptal olmayan siparişleri say
  const activeOrders = orders.filter(o => o.status !== 'IPTAL')
  const completedOrders = orders.filter(o => o.status === 'TESLIM_EDILDI')
  const pendingOrders = orders.filter(o => o.status === 'HAZIRLANIYOR')
  
  // Bekleyen ödemeler
  const totalBorclu = payments
    .filter(p => p.status === 'BEKLIYOR' || p.status === 'GECIKTI')
    .reduce((s, p) => s + p.amount, 0)
  
  const sonSiparisler = orders.filter(o => o.status !== 'IPTAL').slice(0, 3)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Paneliniz</h1>
        <p className="text-gray-500 text-sm">Sipariş ve ödeme özetiniz</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-blue-600">Toplam Sipariş</p>
                <p className="text-2xl font-bold text-blue-700">{activeOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-xs text-yellow-600">Hazırlanıyor</p>
                <p className="text-2xl font-bold text-yellow-700">{pendingOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-green-600">Teslim Edildi</p>
                <p className="text-2xl font-bold text-green-700">{completedOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={totalBorclu > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CreditCard className={`h-5 w-5 ${totalBorclu > 0 ? 'text-red-600' : 'text-gray-600'}`} />
              <div>
                <p className={`text-xs ${totalBorclu > 0 ? 'text-red-600' : 'text-gray-600'}`}>Bekleyen Ödeme</p>
                <p className={`text-xl font-bold ${totalBorclu > 0 ? 'text-red-700' : 'text-gray-700'}`}>{formatCurrency(totalBorclu)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" /></div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Son Siparişler</h2>
            <Link href="/musteri/siparisler" className="text-sm text-blue-600 flex items-center gap-1 hover:underline">
              Tümü <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {sonSiparisler.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <ShoppingCart className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Henüz sipariş yok</p>
                <Link href="/musteri/yeni-siparis">
                  <Button className="mt-3" size="sm">İlk Siparişi Ver</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sonSiparisler.map((o: any) => (
                <Card key={o.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{formatDate(o.createdAt)}</p>
                        <p className="text-xs text-gray-500">{o.orderItems?.length} ürün</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{formatCurrency(o.totalAmount)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ORDER_STATUS_COLOR[o.status] || 'bg-gray-100'}`}>
                          {ORDER_STATUS[o.status] || o.status}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {payments.filter(p => p.status !== 'ODENDI').length > 0 && (
            <div className="space-y-2">
              <h2 className="font-semibold text-gray-800">Bekleyen Ödemeler</h2>
              {payments.filter(p => p.status !== 'ODENDI').map((p: any) => (
                <Card key={p.id} className={p.status === 'GECIKTI' ? 'border-red-200 bg-red-50' : ''}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {p.status === 'GECIKTI' ? <Clock className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-yellow-500" />}
                        <div>
                          <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                          {p.dueDate && <p className="text-xs text-gray-500">Vade: {formatDate(p.dueDate)}</p>}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_STATUS_COLOR[p.status] || 'bg-gray-100'}`}>
                        {p.status === 'GECIKTI' ? 'Gecikti' : 'Bekliyor'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
