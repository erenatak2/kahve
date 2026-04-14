'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { BarChart3, TrendingUp, Package, Users, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']

interface RaporlarClientProps {
  initialData: any[]
  initialYear: number
  session: any
}

export default function RaporlarClient({ initialData, initialYear, session }: RaporlarClientProps) {
  const [activeTab, setActiveTab] = useState<'aylik' | 'urun' | 'musteri'>('aylik')
  const [data, setData] = useState<any[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [year, setYear] = useState(initialYear)

  useEffect(() => {
    // Sayfa ilk yüklendiğinde (aylık ve güncel yıl) fetch yapma, initialData kullan
    if (activeTab === 'aylik' && year === initialYear && data === initialData) return

    setLoading(true)
    fetch(`/api/raporlar?type=${activeTab}&year=${year}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [activeTab, year])

  const maxVal = data.reduce((m: number, d: any) => Math.max(m, activeTab === 'aylik' ? d.totalSales : activeTab === 'urun' ? d.totalRevenue : d.totalRevenue), 0)

  const handleExcelExport = () => {
    if (!data || data.length === 0) return
    
    let rows: any[] = []
    
    if (activeTab === 'aylik') {
      rows = data.map((d: any) => ({
        'Ay': months[d.month - 1],
        'Yıl': year,
        'Sipariş Sayısı': d.orderCount,
        'Satış Tutarı': d.totalSales,
        'Tahsilat Tutarı': d.totalPayments
      }))
    } else if (activeTab === 'urun') {
      let i = 1
      rows = data.map((d: any) => ({
        'Sıra': i++,
        'Ürün Adı': d.product?.name || '(Silinmiş Ürün)',
        'Adet': d.totalQuantity,
        'Ciro': d.totalRevenue
      }))
    } else if (activeTab === 'musteri') {
      let i = 1
      rows = data.filter((d: any) => d.totalOrders > 0).map((d: any) => ({
        'Sıra': i++,
        'Müşteri': d.name,
        'Sipariş Sayısı': d.totalOrders,
        'Ciro': d.totalRevenue,
        'Tahsilat': d.totalPaid
      }))
    }
    
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    
    if (activeTab === 'aylik') {
      ws['!cols'] = [{ wch: 8 }, { wch: 6 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
    } else if (activeTab === 'urun') {
      ws['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 10 }, { wch: 15 }]
    } else {
      ws['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
    }
    
    XLSX.utils.book_append_sheet(wb, ws, 'Rapor')
    XLSX.writeFile(wb, `rapor-${activeTab}-${year}.xlsx`)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Raporlar</h1>
          <p className="text-gray-500 text-sm">Satış ve performans analizleri</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-2">
        {[
          { key: 'aylik', label: 'Aylık', icon: BarChart3 },
          { key: 'urun', label: 'Ürün', icon: Package },
          { key: 'musteri', label: 'Müşteri', icon: Users },
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.key === 'aylik' ? 'Aylık Satışlar' : tab.key === 'urun' ? 'Ürün Analizi' : 'Müşteri Analizi'}</span>
              <span className="sm:hidden">{tab.label}</span>
            </button>
          )
        })}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExcelExport}
            className="gap-1.5 font-bold text-green-700 border-green-200 bg-white"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <select className="flex h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-100" value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
      ) : (
        <>
          {activeTab === 'aylik' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <Card>
                <CardHeader><CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800"><TrendingUp className="h-4 w-4 text-blue-500" />{year} Yılı Aylık Satışlar</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 h-48 mb-4">
                    {data.map((d: any) => (
                      <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group">
                        <div className="w-full flex flex-col gap-0.5 justify-end h-[160px]">
                          <div
                            className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                            style={{ height: maxVal > 0 ? `${(d.totalSales / maxVal) * 140}px` : '2px' }}
                            title={`Satış: ${formatCurrency(d.totalSales)}`}
                          />
                          <div
                            className="w-full bg-green-400 rounded-t transition-all hover:bg-green-500"
                            style={{ height: maxVal > 0 ? `${(d.totalPayments / maxVal) * 140}px` : '2px', marginTop: '-100%', position: 'relative', zIndex: 0 }}
                            title={`Tahsilat: ${formatCurrency(d.totalPayments)}`}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{months[d.month - 1]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs font-bold border-t pt-2">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500" /><span>Satış</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-400" /><span>Tahsilat</span></div>
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.filter((d: any) => d.orderCount > 0).map((d: any) => (
                  <Card key={d.month} className="border-slate-100 hover:shadow-md transition-shadow">
                    <CardContent className="py-4 px-4 h-full flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-3">
                         <span className="font-black text-slate-800 uppercase text-sm tracking-tight">{months[d.month - 1]} {year}</span>
                         <span className="bg-slate-100 text-[10px] font-black px-1.5 py-0.5 rounded text-slate-500 tracking-widest">{d.orderCount} SİPARİŞ</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="border-l-2 border-blue-500 pl-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Satış</p>
                           <p className="font-bold text-blue-600">{formatCurrency(d.totalSales)}</p>
                         </div>
                         <div className="border-l-2 border-green-500 pl-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Tahsilat</p>
                           <p className="font-bold text-green-600">{formatCurrency(d.totalPayments)}</p>
                         </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'urun' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    Ürün Satış Dağılımı ({year})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 flex items-end gap-2 mb-2">
                    {data.slice(0, 15).map((d: any, i: number) => {
                      const percentage = maxVal > 0 ? (d.totalRevenue / maxVal) * 100 : 0
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0 group">
                          <div className="text-[9px] font-black text-slate-400 uppercase truncate w-full text-center" title={d.product?.name}>
                            #{i + 1}
                          </div>
                          <div
                            className="w-full bg-blue-500 rounded-t hover:bg-orange-500 transition-all relative"
                            style={{ height: `${Math.max(percentage * 1.5, 4)}px` }}
                          >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-900 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg whitespace-nowrap z-20 shadow-xl">
                              {d.product?.name}: {formatCurrency(d.totalRevenue)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.length === 0 && <Card><CardContent className="py-16 text-center text-slate-400 flex flex-col items-center gap-2"><Package className="h-8 w-8 opacity-20" /><p className="font-medium">Henüz ürün satış verisi yok</p></CardContent></Card>}
                {data.map((d: any, i: number) => (
                  <Card key={d.product?.id || i} className="border-slate-100 hover:shadow-md transition-all group">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-black text-slate-200 group-hover:text-slate-300 transition-colors w-10 italic">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate uppercase tracking-tight">{d.product?.name || '(Silinmiş Ürün)'}</p>
                          <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                            <div className="bg-blue-500 h-2 rounded-full transition-all group-hover:bg-orange-500" style={{ width: `${maxVal > 0 ? (d.totalRevenue / maxVal) * 100 : 0}%` }} />
                          </div>
                        </div>
                        <div className="text-right shrink-0 bg-slate-50 p-2 rounded-xl border border-slate-100 min-w-[100px]">
                          <p className="font-black text-blue-600 text-sm">{formatCurrency(d.totalRevenue)}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{d.totalQuantity} Adet</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'musteri' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              {data.filter((d: any) => d.totalOrders > 0).length === 0 && <Card><CardContent className="py-16 text-center text-slate-400 flex flex-col items-center gap-2"><Users className="h-8 w-8 opacity-20" /><p className="font-medium">{year} yılında müşteri sipariş verisi yok</p></CardContent></Card>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.filter((d: any) => d.totalOrders > 0).map((d: any, i: number) => (
                  <Card key={d.customerId} className="hover:shadow-md transition-all border-slate-100 group">
                    <CardContent className="py-4 px-4">
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-black text-slate-200 group-hover:text-slate-300 transition-colors w-10">#{i + 1}</span>
                        <div className="flex-1">
                          <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{d.name}</p>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                            <div className="bg-purple-500 h-1.5 rounded-full group-hover:bg-purple-600" style={{ width: `${maxVal > 0 ? (d.totalRevenue / maxVal) * 100 : 0}%` }} />
                          </div>
                        </div>
                        <div className="text-right bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <p className="font-black text-purple-700 text-sm">{formatCurrency(d.totalRevenue)}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                            {d.totalOrders} Sipro • Tahsilat: {formatCurrency(d.totalPaid)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
