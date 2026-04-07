'use client'

import { useEffect, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ShoppingBag, Loader2, LogOut } from 'lucide-react'
import { formatCurrency, formatDate, ORDER_STATUS_COLOR, ORDER_STATUS } from '@/lib/utils'
import { ShoppingCart, Users, Package, TrendingUp, Clock, CreditCard } from 'lucide-react'

// Dashboard Component
function AdminDashboard() {
  const { data: session } = useSession()
  const [data, setData] = useState<any>(null)
  const [pendingPayments, setPendingPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isSalesRep = (session?.user as any)?.role === 'SATICI'

  useEffect(() => {
    Promise.all([
      fetch('/api/raporlar?type=genel').then(r => r.json()),
      fetch('/api/urunler').then(r => r.json()),
      fetch('/api/tahsilat?all=true').then(r => r.json()),
    ]).then(([d, p, pay]) => {
      setData(d)
      setPendingPayments(pay.filter((p: any) => p.status === 'BEKLIYOR' || p.status === 'GECIKTI'))
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="p-8 flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )

  const totalPendingDebt = pendingPayments.reduce((s, p) => s + p.amount, 0)
  const overdueCount = pendingPayments.filter((p: any) => p.status === 'GECIKTI').length

  const stats = [
    { title: isSalesRep ? 'Kendi Siparişlerim' : 'Toplam Sipariş', value: data?.totalOrders || 0, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: isSalesRep ? 'Kendi Cirom' : 'Toplam Ciro', value: formatCurrency(data?.totalRevenue || 0), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { title: isSalesRep ? 'Benim Müşterilerim' : 'Aktif Müşteri', value: data?.totalCustomers || 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: totalPendingDebt > 0 ? (isSalesRep ? 'Müşterilerimin Borcu' : `Alacaklar${overdueCount > 0 ? ` (${overdueCount} gecikmiş)` : ''}`) : 'Ürün Sayısı', value: totalPendingDebt > 0 ? formatCurrency(totalPendingDebt) : data?.totalProducts || 0, icon: totalPendingDebt > 0 ? CreditCard : Package, color: totalPendingDebt > 0 ? 'text-red-600' : 'text-orange-600', bg: totalPendingDebt > 0 ? 'bg-red-50' : 'bg-orange-50' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
          {isSalesRep ? `Hoş Geldin, ${session?.user?.name}` : 'Gösterge Paneli'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {isSalesRep ? 'Satış performansınız ve bekleyen işleriniz.' : 'Satış yönetim sistemi genel özeti'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500 truncate">{stat.title}</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900 mt-0.5 truncate">{stat.value}</p>
                  </div>
                  <div className={`${stat.bg} p-2 md:p-3 rounded-xl ml-2 shrink-0`}>
                    <Icon className={`h-5 w-5 md:h-6 md:w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Son Siparişler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.recentOrders?.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Henüz sipariş yok</p>
              ) : (
                data?.recentOrders?.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{order.customer?.user?.name}</p>
                      <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(order.totalAmount)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ORDER_STATUS_COLOR[order.status] || 'bg-gray-100'}`}>
                        {ORDER_STATUS[order.status] || order.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {pendingPayments.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-red-700">
                  <CreditCard className="h-4 w-4" />
                  Alacaklar / Bekleyen Ödeme ({pendingPayments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingPayments.slice(0, 4).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-gray-700 text-xs">{p.order?.customer?.user?.name}</p>
                        {p.dueDate && <p className="text-xs text-gray-400">Vade: {formatDate(p.dueDate)}</p>}
                      </div>
                      <span className={`font-bold text-sm ${p.status === 'GECIKTI' ? 'text-red-600' : 'text-yellow-700'}`}>
                        {formatCurrency(p.amount)}
                      </span>
                    </div>
                  ))}
                  {pendingPayments.length > 0 && (
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold text-sm">
                      <span>Toplam</span>
                      <span className="text-red-600">{formatCurrency(pendingPayments.reduce((s, p) => s + p.amount, 0))}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') return (
    <div className="p-8 flex items-center justify-center h-full">
      <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
    </div>
  )

  if (status === 'authenticated' && ((session?.user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'SATICI')) {
    return <AdminDashboard />
  }

  return null
}
