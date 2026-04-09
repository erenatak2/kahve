'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate, ORDER_STATUS_COLOR, ORDER_STATUS } from '@/lib/utils'
import { ArrowLeft, FileText, Printer, Download, Target, Package, Clock, ShieldCheck, User as UserIcon, Check, X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import * as XLSX from 'xlsx'

export default function PersonelPerformansPage() {
  const params = useParams()
  const router = useRouter()
  const [member, setMember] = useState<any>(null)
  const [team, setTeam] = useState<any[]>([])
  const [pendingAssignments, setPendingAssignments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchPerformans()
  }, [params.id])

  const fetchPerformans = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ekip')
      const data = await res.json()
      if (res.ok) {
        setTeam(data)
        const found = data.find((m: any) => m.id === params.id)
        setMember(found)
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleQuickAssign = async (customerId: string, salesRepId: string) => {
    if (!salesRepId) return
    try {
      const res = await fetch(`/api/musteriler/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesRepId }),
      })
      if (res.ok) {
        toast({ title: 'Başarılı', description: 'Müşteri yeni satıcıya aktarıldı.' })
        fetchPerformans() // Refresh data
        setPendingAssignments(prev => {
          const next = { ...prev }
          delete next[customerId]
          return next
        })
      } else {
        toast({ title: 'Hata', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Hata', variant: 'destructive' })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExcelExport = () => {
    if (!member?.stats?.recentOrders) return
    
    const rows = member.stats.recentOrders.map((o: any) => ({
      'Tarih': formatDate(o.createdAt),
      'Müşteri': o.customer?.user?.name,
      'Ürünler': o.orderItems?.map((i: any) => `${i.quantity}x ${i.product.name}`).join(', '),
      'Durum': ORDER_STATUS[o.status],
      'Tutar': o.totalAmount
    }))
    
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Performans Raporu')
    XLSX.writeFile(wb, `${member.name}-performans.xlsx`)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="p-8 text-center text-gray-500">
        Personel bilgisi bulunamadı.
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 print:p-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Geri
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Personel Performans Dökümü</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExcelExport}>
            <Download className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Yazdır
          </Button>
        </div>
      </div>

      {/* Personel Bilgileri & Özet */}
      <Card className="print:border-0 print:shadow-none bg-white border-blue-100 shadow-sm overflow-hidden">
        <div className="h-2 bg-blue-600" />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${member.role === 'ADMIN' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                {member.role === 'ADMIN' ? <ShieldCheck className="h-8 w-8 text-purple-700" /> : <UserIcon className="h-8 w-8 text-blue-700" />}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-gray-900">{member.name}</h2>
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                    member.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {member.role === 'ADMIN' ? 'YÖNETİCİ' : 'SATIŞ TEMSİLCİSİ'}
                  </span>
                </div>
                <p className="text-gray-500">{member.email}</p>
                <p className="text-xs text-gray-400 mt-1">Sistem Kayıt: {formatDate(member.createdAt)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-right">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Toplam Portföy</p>
                <p className="text-2xl font-black text-blue-600">{member.stats?.customerCount || 0} Müşteri</p>
              </div>
              <div className="border-l pl-4">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Genel Ciro</p>
                <p className="text-2xl font-black text-green-600">{formatCurrency(member.stats?.totalSales || 0)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Müşteriler Tablosu */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50/50 border-b pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Target className="h-4 w-4 text-red-500" />
              Sorumlu Olduğu En Değerli Müşteriler
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/30">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Müşteri</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Sipariş</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Toplam Satış</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Sorumlu Satıcı</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {member.stats?.customerDetails?.map((cust: any) => (
                  <tr key={cust.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-700">{cust.name}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{cust.orderCount}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(cust.totalSales)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <select 
                          className="text-sm h-9 rounded-lg border-gray-300 bg-white px-3 focus:ring-2 focus:ring-blue-500 shadow-sm transition-all outline-none font-medium text-gray-900 hover:border-blue-400 cursor-pointer"
                          onChange={(e) => setPendingAssignments(prev => ({ ...prev, [cust.id]: e.target.value }))}
                          value={pendingAssignments[cust.id] || member.id}
                        >
                          {team.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        {pendingAssignments[cust.id] && pendingAssignments[cust.id] !== member.id && (
                          <div className="flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
                            <Button 
                              size="sm" 
                              className="h-9 w-9 p-0 bg-green-500 hover:bg-green-600 text-white shadow-lg active:scale-95 transition-transform" 
                              onClick={() => handleQuickAssign(cust.id, pendingAssignments[cust.id])}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50" 
                              onClick={() => setPendingAssignments(prev => {
                                const next = { ...prev }
                                delete next[cust.id]
                                return next
                              })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Ürün Bazlı Satış Performansı */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50/50 border-b pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-500" />
              Ürün Bazlı Satış Hacmi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/30">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Ürün İsmi</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Miktar</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Ciro Katkısı</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {member.stats?.productDetails?.map((prod: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-700">{prod.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">{prod.quantity} Adet</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(prod.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Son Hareketler - Görsel Detaylı */}
      <Card className="shadow-sm">
        <CardHeader className="bg-gray-50/50 border-b pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            Personel Satış Hareketleri (Son {member.stats?.recentOrders?.length || 0} İşlem)
          </CardTitle>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Canlı Akış</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/30">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 w-32">Tarih</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Müşteri</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Sipariş İçeriği</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Durum</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {member.stats?.recentOrders?.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-800">{order.customer?.user?.name}</p>
                      <p className="text-[10px] text-gray-400">{order.customer?.city || 'Şehir Belirtilmemiş'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {order.orderItems?.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 bg-gray-50 border px-2 py-1 rounded-lg">
                            {item.product?.image ? (
                              <img src={item.product.image} className="h-6 w-6 object-contain" />
                            ) : (
                              <div className="h-6 w-6 bg-gray-100 flex items-center justify-center text-[8px] rounded">☕</div>
                            )}
                            <span className="text-[10px] font-medium text-gray-600">{item.quantity}x {item.product.name}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${ORDER_STATUS_COLOR[order.status]}`}>
                        {ORDER_STATUS[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-black text-blue-700">{formatCurrency(order.totalAmount)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Footer Info */}
      <div className="text-center py-4 print:hidden">
        <p className="text-[11px] text-gray-400 flex items-center justify-center gap-2 uppercase tracking-widest font-bold">
          <FileText className="h-3 w-3" />
          Kullanıcı Performans Takip Sistemi Karar Destek Raporu
        </p>
      </div>
    </div>
  )
}
