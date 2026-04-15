'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingBag, TrendingUp, Users, Package, Clock, CreditCard, ShoppingCart, Phone, CheckCircle, MessageCircle, AlertCircle, MapPin, Bell, BellOff } from 'lucide-react'
import { formatCurrency, formatDate, ORDER_STATUS_COLOR, ORDER_STATUS, cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface AdminDashboardClientProps {
  initialData: any
  session: any
}

const WHATSAPP_TEMPLATES = [
  { label: 'Genel Hatırlatma', text: (name: string) => `Merhaba ${name}, sizi aramıştım. Müsait olduğunuzda dönebilir misiniz?` },
  { label: 'Sipariş Bilgisi', text: (name: string) => `Merhaba ${name}, kahve siparişiniz için bilgi almak istedim.` },
  { label: 'Takip Araması', text: (name: string) => `Merhaba ${name}, geçen görüşmemizde söz vermiştiniz, hatırlatmak istedim.` },
]

export default function AdminDashboardClient({ initialData, session }: AdminDashboardClientProps) {
  const { stats, recentOrders, pendingPayments, reminders, todayCalls, segments } = initialData
  const isSalesRep = (session?.user as any)?.role === 'SATICI'
  const { toast } = useToast()

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [whatsappMenu, setWhatsappMenu] = useState<string | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [schedulingCall, setSchedulingCall] = useState<string | null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Ses dosyasını hazırla
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
    
    // Tarayıcı bildirim izni kontrolü
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true)
      }
    }
  }, [])

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({ title: 'Hata', description: 'Tarayıcınız bildirimleri desteklemiyor.', variant: 'destructive' })
      return
    }

    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      setNotificationsEnabled(true)
      new Notification('Bildirimler Aktif!', { body: 'Artık kritik aramalar için uyarı alacaksınız.', icon: '/favicon.ico' })
    }
  }

  // Kritik aramalar için periyodik kontrol (demo amaçlı basitleştirilmiş)
  useEffect(() => {
    if (notificationsEnabled && pendingCallsCount > 0) {
      const lateCalls = todayCalls.filter((c: any) => !completedIds.has(c.id) && isLate(c.date))
      if (lateCalls.length > 0) {
        // Zil çal ve bildirim gönder
        audioRef.current?.play().catch(() => {})
        new Notification('Kritik Aramalar Var!', { 
          body: `Gecikmiş ${lateCalls.length} adet aramanız bulunuyor.`,
          tag: 'late-calls'
        })
      }
    }
  }, [notificationsEnabled])

  const totalPendingDebt = pendingPayments.reduce((s: number, p: any) => s + p.amount, 0)
  const overdueCount = pendingPayments.filter((p: any) => p.status === 'GECIKTI').length

  const filteredCalls = todayCalls.filter((c: any) => {
    const isNotDone = !completedIds.has(c.id)
    return isNotDone
  })

  const pendingCallsCount = todayCalls.filter((c: any) => !completedIds.has(c.id)).length
  const now = new Date()

  const isLate = (date: any) => date && new Date(date) < now

  const markDone = async (item: any) => {
    try {
      await fetch('/api/admin/call-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: item.type === 'CUSTOMER' ? item.id : item.customerId,
          note: 'Dashboard\'dan tamamlandı',
          outcome: 'GORUSTUK',
          type: item.type,
          relatedId: item.type === 'ORDER' ? item.id : undefined
        })
      })
      setCompletedIds(prev => new Set(Array.from(prev).concat(item.id)))
      toast({ title: '✅ Tamamlandı', description: `${item.name} araması tamamlandı.` })
    } catch {
      toast({ title: 'Hata', variant: 'destructive' })
    }
  }

  const openWhatsApp = (phone: string, name: string, template: (n: string) => string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    const fullPhone = cleanPhone.startsWith('0') ? '90' + cleanPhone.slice(1) : cleanPhone.startsWith('90') ? cleanPhone : '90' + cleanPhone
    const text = encodeURIComponent(template(name.split(' ')[0]))
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank')
    setWhatsappMenu(null)
  }

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
      {pendingCallsCount > 0 && (
        <div className="bg-orange-600 text-white py-3 px-6 relative rounded-xl shadow-lg border-2 border-orange-400 animate-in slide-in-from-left duration-700 ease-out">
          <div className="flex items-center gap-3 font-bold italic">
            <span className="text-xl">📢</span>
            <p>Dikkat! Bugün tamamlamanız gereken <span className="bg-orange-500 px-2 py-0.5 rounded-lg border border-orange-300 not-italic">{pendingCallsCount}</span> adet arama bulunuyor. Müşterilerinize geri dönüş yapmayı unutmayın!</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            {isSalesRep ? `Hoş Geldin, ${session?.user?.name}` : 'Gösterge Paneli'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isSalesRep ? 'Satış performansınız ve bekleyen işleriniz.' : 'Satış yönetim sistemi genel özeti'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className={cn("gap-2", notificationsEnabled ? "text-green-600 border-green-200" : "text-gray-500")}
            onClick={requestNotificationPermission}
          >
            {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            {notificationsEnabled ? 'Bildirimler Açık' : 'Bildirimleri Aç'}
          </Button>
        </div>
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


      {/* ===== BUGÜN ARANACAKLAR WIDGET ===== */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base text-orange-800">
            <div className="relative">
              <Phone className="h-5 w-5 text-orange-600" />
              {pendingCallsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingCallsCount}
                </span>
              )}
            </div>
            Bugün Aranacaklar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredCalls.length > 0 ? (
            <>
              {filteredCalls.slice(0, 5).map((item: any) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-xl border bg-white shadow-sm gap-3 ${isLate(item.date) ? 'border-red-200' : 'border-orange-100'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isLate(item.date) ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                      {item.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                      <div className="flex items-center gap-2">
                        {item.phone && <p className="text-xs text-gray-500">{item.phone}</p>}
                        {item.region && (
                            <span className="flex items-center gap-0.5 text-[10px] text-orange-600 bg-orange-50 px-1 rounded-full">
                                <MapPin className="h-2.5 w-2.5" /> {item.region}
                            </span>
                        )}
                        {isLate(item.date) && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600">
                            <AlertCircle className="h-2.5 w-2.5" /> Gecikti
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 relative">
                    {item.phone && (
                      <>
                        <button
                          onClick={() => setWhatsappMenu(whatsappMenu === item.id ? null : item.id)}
                          className="w-8 h-8 rounded-lg bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors shadow-sm"
                          title="WhatsApp Mesaj"
                        >
                          <MessageCircle className="h-4 w-4 text-white" />
                        </button>
                        {whatsappMenu === item.id && (
                          <div className="absolute right-0 top-9 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-2 w-56 space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase px-2 pb-1">Şablon Seç</p>
                            {WHATSAPP_TEMPLATES.map((tpl, i) => (
                              <button
                                key={i}
                                onClick={() => openWhatsApp(item.phone, item.name, tpl.text)}
                                className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-green-50 text-gray-700 hover:text-green-700 transition-colors"
                              >
                                {tpl.label}
                              </button>
                            ))}
                          </div>
                        )}
                        <a
                          href={`tel:${item.phone}`}
                          className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors shadow-sm"
                          title="Ara"
                        >
                          <Phone className="h-4 w-4 text-white" />
                        </a>
                      </>
                    )}
                    <Button
                      size="sm"
                      onClick={() => markDone(item)}
                      className="h-8 px-2.5 gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-sm"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Arandı</span>
                    </Button>
                  </div>
                </div>
              ))}
              {filteredCalls.length > 5 && (
                <p className="text-center text-xs text-orange-600 pt-1">
                  +{filteredCalls.length - 5} daha… <a href="/admin/takip" className="underline font-bold">Tümünü gör</a>
                </p>
              )}
            </>
          ) : (
            <div className="py-4 flex items-center justify-center gap-3 bg-white/50 rounded-xl border border-dashed border-orange-200">
               <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
               <p className="text-sm text-gray-500 italic">Bu kriterlere uygun bekleyen arama bulunamadı.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
            {segments && (
                <Card className="border-slate-200">
                    <CardHeader className="pb-2 border-b mb-3 px-4">
                        <CardTitle className="text-base text-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                Müşteri Portföy Sağlığı
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">OTOMATİK ANALİZ</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 px-4 pb-4">
                        <div className="grid grid-cols-4 gap-2">
                            <div className="bg-purple-50 p-2 rounded-lg text-center">
                                <p className="text-[10px] font-bold text-purple-600 uppercase">VIP</p>
                                <p className="text-xl font-black text-purple-900">{segments.vip.length}</p>
                            </div>
                            <div className="bg-green-50 p-2 rounded-lg text-center">
                                <p className="text-[10px] font-bold text-green-600 uppercase">DÜZENLİ</p>
                                <p className="text-xl font-black text-green-900">{segments.regular.length}</p>
                            </div>
                            <div className="bg-orange-50 p-2 rounded-lg text-center">
                                <p className="text-[10px] font-bold text-orange-600 uppercase">RİSKLİ</p>
                                <p className="text-xl font-black text-orange-900">{segments.atRisk.length}</p>
                            </div>
                            <div className="bg-red-50 p-2 rounded-lg text-center">
                                <p className="text-[10px] font-bold text-red-600 uppercase">PASİF</p>
                                <p className="text-xl font-black text-red-900">{segments.passive.length}</p>
                            </div>
                        </div>

                        {segments.atRisk.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> KRİTİK TAKİP LİSTESİ
                                </p>
                                {segments.atRisk.slice(0, 3).map((c: any) => (
                                    <div key={c.id} className="bg-white p-2.5 rounded-xl border border-orange-100 flex items-center justify-between shadow-sm hover:border-orange-300 transition-colors group">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-900 truncate">{c.name}</p>
                                            <p className="text-[11px] text-slate-500 font-medium italic">Son siparişten {c.daysSinceLastOrder} gün geçti (Ort. {c.avgDays})</p>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-8 text-[10px] font-bold border-orange-200 text-orange-700 hover:bg-orange-50"
                                                onClick={async () => {
                                                    setSchedulingCall(c.id)
                                                    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
                                                    const res = await fetch('/api/admin/takip', {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ customerId: c.id, date: tomorrow.toISOString().split('T')[0] })
                                                    })
                                                    if (res.ok) toast({ title: 'Arama Planlandı', description: `${c.name} için yarına arama randevusu oluşturuldu.` })
                                                    setSchedulingCall(null)
                                                }}
                                                disabled={schedulingCall === c.id}
                                            >
                                                YARIN ARA
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {segments.atRisk.length > 3 && (
                                    <p className="text-center text-[10px] font-bold text-slate-400">+{segments.atRisk.length - 3} daha riskli müşteri var</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

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
        </div>

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
