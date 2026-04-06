'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { BarChart3, TrendingUp, Package, Users, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']

export default function RaporlarPage() {
  const [activeTab, setActiveTab] = useState<'aylik' | 'urun' | 'musteri'>('aylik')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
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
    
    // Workbook oluştur
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    
    // Sütun genişlikleri
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
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Raporlar</h1>
        <p className="text-gray-500 text-sm">Satış ve performans analizleri</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
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
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
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
            className="gap-1"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            Excel
          </Button>
          <select className="flex h-9 rounded-md border border-input bg-background px-3 text-sm" value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : (
        <>
          {activeTab === 'aylik' && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />{year} Yılı Aylık Satışlar</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 h-48">
                    {data.map((d: any) => (
                      <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col gap-0.5 justify-end" style={{ height: '160px' }}>
                          <div
                            className="w-full bg-blue-500 rounded-t"
                            style={{ height: maxVal > 0 ? `${(d.totalSales / maxVal) * 140}px` : '2px' }}
                            title={`Satış: ${formatCurrency(d.totalSales)}`}
                          />
                          <div
                            className="w-full bg-green-400 rounded-t"
                            style={{ height: maxVal > 0 ? `${(d.totalPayments / maxVal) * 140}px` : '2px', marginTop: '-100%', position: 'relative', zIndex: 0 }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{months[d.month - 1]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500" /><span>Satış</span></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-400" /><span>Tahsilat</span></div>
                  </div>
                </CardContent>
              </Card>
              <div className="grid gap-2">
                {data.filter((d: any) => d.orderCount > 0).map((d: any) => (
                  <Card key={d.month}>
                    <CardContent className="py-3 px-4">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <span className="font-medium text-sm">{months[d.month - 1]} {year}</span>
                        <div className="flex gap-3 md:gap-6 text-sm">
                          <div className="text-right"><p className="text-xs text-gray-500">Sipariş</p><p className="font-medium">{d.orderCount}</p></div>
                          <div className="text-right"><p className="text-xs text-gray-500">Satış</p><p className="font-semibold text-blue-600">{formatCurrency(d.totalSales)}</p></div>
                          <div className="text-right"><p className="text-xs text-gray-500">Tahsilat</p><p className="font-semibold text-green-600">{formatCurrency(d.totalPayments)}</p></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'urun' && (
            <div className="space-y-4">
              {/* Ürün Grafiği */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Ürün Satış Dağılımı ({year})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 flex items-end gap-2">
                    {data.slice(0, 10).map((d: any, i: number) => {
                      const percentage = maxVal > 0 ? (d.totalRevenue / maxVal) * 100 : 0
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                          <div className="text-[10px] text-gray-500 truncate w-full text-center" title={d.product?.name}>
                            #{i + 1}
                          </div>
                          <div
                            className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative group"
                            style={{ height: `${Math.max(percentage * 1.5, 4)}px` }}
                          >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                              {d.product?.name}: {formatCurrency(d.totalRevenue)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
              
              {/* Ürün Listesi */}
              <div className="space-y-3">
                {data.length === 0 && <Card><CardContent className="py-10 text-center text-gray-500 text-sm">Henüz ürün satış verisi yok</CardContent></Card>}
                {data.map((d: any, i: number) => (
                  <Card key={d.product?.id || i}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-300 w-8">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{d.product?.name || '(Silinmiş Ürün)'}</p>
                          <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${maxVal > 0 ? (d.totalRevenue / maxVal) * 100 : 0}%` }} />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm text-blue-600">{formatCurrency(d.totalRevenue)}</p>
                          <p className="text-xs text-gray-500">{d.totalQuantity} adet</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'musteri' && (
            <div className="space-y-3">
              {data.filter((d: any) => d.totalOrders > 0).length === 0 && <Card><CardContent className="py-10 text-center text-gray-500 text-sm">{year} yılında müşteri sipariş verisi yok</CardContent></Card>}
              {data.filter((d: any) => d.totalOrders > 0).map((d: any, i: number) => (
                <Card key={d.customerId}>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-300 w-8">#{i + 1}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{d.name}</p>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                          <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${maxVal > 0 ? (d.totalRevenue / maxVal) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-purple-600">{formatCurrency(d.totalRevenue)}</p>
                        <p className="text-xs text-gray-500">{d.totalOrders} sipariş • Tahsilat: {formatCurrency(d.totalPaid)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
