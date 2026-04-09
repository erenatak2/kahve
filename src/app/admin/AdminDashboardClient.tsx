'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingBag, TrendingUp, Users, Package, Clock, CreditCard, ShoppingCart } from 'lucide-react'
import { formatCurrency, formatDate, ORDER_STATUS_COLOR, ORDER_STATUS } from '@/lib/utils'

interface AdminDashboardClientProps {
  initialData: any
  session: any
}

export default function AdminDashboardClient({ initialData, session }: AdminDashboardClientProps) {
  const { stats, recentOrders, pendingPayments, reminders } = initialData
  const isSalesRep = (session?.user as any)?.role === 'SATICI'

  const totalPendingDebt = pendingPayments.reduce((s: number, p: any) => s + p.amount, 0)
  const overdueCount = pendingPayments.filter((p: any) => p.status === 'GECIKTI').length

  const cardStats = [
    { title: isSalesRep ? 'Kendi Siparişlerim' : 'Toplam Sipariş', value: stats.totalOrders || 0, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: isSalesRep ? 'Kendi Cirom' : 'Toplam Ciro', value: formatCurrency(stats.totalRevenue || 0), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { title: isSalesRep ? 'Benim Müşterilerim' : 'Aktif Müşteri', value: stats.totalCustomers || 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { 
      title: totalPendingDebt > 0 ? (isSalesRep ? 'Müşterilerimin Borcu' : `Alacaklar${overdueCount > 0 ? ` (${overdueCount} gecikmiş)` : ''}`) : 'Ürün Sayısı', 
      value: totalPendingDebt > 0 ? formatCurrency(totalPendingDebt) : stats.totalProducts || 0, 
      icon: totalPendingDebt > 0 ? CreditCard : Package, 
      color: totalPendingDebt > 0 ? 'text-red-600' : 'text-orange-600', 
      bg: totalPendingDebt > 0 ? 'bg-red-50' : 'bg-orange-50' 
    },
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
        {cardStats.map((stat) => {
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
              {recentOrders.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">Henüz sipariş yok</p>
              ) : (
                recentOrders.map((order: any) => (
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
          {reminders.length > 0 && (
            <Card className="border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-blue-700">
                  <Clock className="h-4 w-4" />
                  Müşteri Hatırlatıcıları ({reminders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reminders.slice(0, 5).map((o: any) => (
                    <div key={o.id} className="flex flex-col gap-1 p-2 rounded-lg bg-blue-50/50 border border-blue-100/50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-blue-900">{o.customer?.user?.name}</span>
                        <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-1.5 rounded">{formatDate(o.reminderAt)}</span>
                      </div>
                      {o.reminderNote && <p className="text-[11px] text-blue-600 italic">"{o.reminderNote}"</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold text-sm">
                    <span>Toplam Bekleyen</span>
                    <span className="text-red-600">{formatCurrency(totalPendingDebt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
