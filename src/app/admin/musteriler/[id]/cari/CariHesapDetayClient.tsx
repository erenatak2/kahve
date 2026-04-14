'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, FileText, Printer, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Hareket {
  siraNo: number
  tarih: string
  tip: 'SIPARIS' | 'TAHSILAT' | 'ACILIS'
  evrakNo: string
  aciklama: string
  urunler?: { ad: string; kod?: string; resim?: string; miktar: number; birimFiyat: number; toplam?: number }[]
  odemeYontemi?: string
  ilgiliSiparis?: string
  borc: number
  alacak: number
  bakiye: number
  acilis?: boolean
}

interface CariHesapDetayClientProps {
  initialData: any
  customerId: string
}

export default function CariHesapDetayClient({ initialData, customerId }: CariHesapDetayClientProps) {
  const router = useRouter()
  const [data, setData] = useState<any>(initialData)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(initialData.donem?.baslangic || '')
  const [endDate, setEndDate] = useState(initialData.donem?.bitis || '')

  const fetchCariHesap = async () => {
    setLoading(true)
    let url = `/api/musteriler/${customerId}/cari`
    const query = new URLSearchParams()
    if (startDate) query.set('startDate', startDate)
    if (endDate) query.set('endDate', endDate)
    if (query.toString()) url += `?${query.toString()}`
    
    const res = await fetch(url)
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExcelExport = () => {
    if (!data?.hareketler) return
    
    const rows = data.hareketler.map((h: Hareket) => ({
      'No': h.siraNo,
      'Tarih': formatDate(h.tarih),
      'Evrak No': h.evrakNo,
      'Tür': h.tip === 'SIPARIS' ? 'Sipariş' : h.tip === 'TAHSILAT' ? 'Tahsilat' : 'Devir',
      'Açıklama': h.aciklama,
      'Borç': h.borc > 0 ? h.borc : 0,
      'Alacak': h.alacak > 0 ? h.alacak : 0,
      'Bakiye': h.bakiye || 0
    }))
    
    rows.push({
      'No': '',
      'Tarih': '',
      'Evrak No': '',
      'Tür': '',
      'Açıklama': 'TOPLAM',
      'Borç': data.ozet.toplamBorc,
      'Alacak': data.ozet.toplamAlacak,
      'Bakiye': data.ozet.bakiye
    })
    
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    
    ws['!cols'] = [
      { wch: 5 },   { wch: 12 },  { wch: 15 },  { wch: 10 },  
      { wch: 30 },  { wch: 12 },  { wch: 12 },  { wch: 12 }
    ]
    
    XLSX.utils.book_append_sheet(wb, ws, 'Cari Hesap')
    XLSX.writeFile(wb, `cari-hesap-${data.musteri.ad}-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  if (!data?.musteri) {
    return <div className="p-8 text-center text-gray-500">Müşteri bilgisi yüklenemedi</div>
  }

  return (
    <div className="p-4 md:p-6 space-y-4 print:p-0">
      {/* Header - print gizle */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="h-9">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Geri Dön
          </Button>
          <div className="flex flex-col">
             <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">Cari Hesap Dökümü</h1>
             <span className="text-xs text-slate-500 mt-1">{data.musteri.ad}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExcelExport} className="h-9 font-bold text-green-700 border-green-200 hover:bg-green-50">
            <Download className="h-4 w-4 mr-1.5 text-green-600" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 font-bold text-blue-700 border-blue-200 hover:bg-blue-50">
            <Printer className="h-4 w-4 mr-1.5 text-blue-600" /> Yazdır
          </Button>
        </div>
      </div>

      {/* Müşteri Bilgileri */}
      <Card className="print:border-0 print:shadow-none overflow-hidden border-slate-200">
        <CardContent className="p-0 border-t-4 border-blue-500">
          <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 uppercase">{data.musteri.ad}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-slate-500">
                <span className="flex items-center gap-1.5 underline decoration-slate-300 underline-offset-2">{data.musteri.email}</span>
                {data.musteri.telefon && <span className="flex items-center gap-1.5 opacity-80 decoration-slate-200">📞 {data.musteri.telefon}</span>}
                {data.musteri.vergiNo && <span className="flex items-center gap-1.5 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">VN: {data.musteri.vergiNo}</span>}
              </div>
              {data.musteri.adres && <p className="text-xs text-slate-400 mt-2 max-w-sm italic">{data.musteri.adres}</p>}
            </div>
            <div className="text-right space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[200px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dönem Özeti</p>
              <p className="text-xs font-bold text-slate-600">
                {data.donem.baslangic ? formatDate(data.donem.baslangic) : 'Tümü'} - {data.donem.bitis ? formatDate(data.donem.bitis) : 'Günümüz'}
              </p>
              <div className="pt-2 border-t mt-2">
                 <p className="text-xs text-slate-500 font-medium">Güncel Bakiye</p>
                 <p className={`text-2xl font-black tabular-nums tracking-tighter ${data.ozet.bakiye > 0 ? 'text-red-600' : 'text-green-600'}`}>
                   {formatCurrency(data.ozet.bakiye)}
                 </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tarih Filtresi - print gizle */}
      <div className="flex flex-wrap items-center gap-3 print:hidden bg-slate-50 p-3 rounded-xl border border-dashed border-slate-300">
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black text-slate-500 uppercase ml-2">Tarih Aralığı:</span>
           <input
             type="date"
             className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-100 outline-none"
             value={startDate}
             onChange={(e) => setStartDate(e.target.value)}
           />
           <span className="text-slate-400">-</span>
           <input
             type="date"
             className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-100 outline-none"
             value={endDate}
             onChange={(e) => setEndDate(e.target.value)}
           />
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={fetchCariHesap} disabled={loading} className="h-8 text-xs font-bold bg-white border-blue-200 text-blue-700">
            {loading ? 'Yükleniyor...' : 'Filtrele'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate(''); setTimeout(fetchCariHesap, 0) }} className="h-8 text-xs font-bold">
            Sıfırla
          </Button>
        </div>
      </div>

      {/* Cari Hesap Tablosu */}
      <Card className="print:border-0 print:shadow-none border-slate-200 overflow-hidden shadow-sm">
        <CardHeader className="print:hidden border-b bg-slate-50/50 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            Hesap Hareket Detayları
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.hareketler?.length === 0 ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <FileText className="h-8 w-8 opacity-20" />
              <p className="font-medium text-sm">Bu dönemde hesap hareketi bulunmamaktadır.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/80 print:bg-transparent">
                    <th className="px-4 py-3 text-left font-black text-slate-500 text-[10px] uppercase tracking-wider w-8">#</th>
                    <th className="px-4 py-3 text-left font-black text-slate-500 text-[10px] uppercase tracking-wider">Tarih</th>
                    <th className="px-4 py-3 text-left font-black text-slate-500 text-[10px] uppercase tracking-wider">Evrak No</th>
                    <th className="px-4 py-3 text-left font-black text-slate-500 text-[10px] uppercase tracking-wider">Tür</th>
                    <th className="px-4 py-3 text-left font-black text-slate-500 text-[10px] uppercase tracking-wider">Açıklama</th>
                    <th className="px-4 py-3 text-right font-black text-red-600 text-[10px] uppercase tracking-wider">Borç</th>
                    <th className="px-4 py-3 text-right font-black text-green-700 text-[10px] uppercase tracking-wider">Alacak</th>
                    <th className="px-4 py-3 text-right font-black text-slate-800 text-[10px] uppercase tracking-wider">Bakiye</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.hareketler?.map((h: Hareket, i: number) => (
                    <tr key={i} className={`hover:bg-slate-50/80 transition-colors print:hover:bg-transparent ${h.acilis ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3 text-slate-400 text-[10px] font-bold">{h.siraNo}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{formatDate(h.tarih)}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400 font-bold uppercase">{h.evrakNo}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border ${
                          h.tip === 'SIPARIS' 
                            ? 'bg-blue-50 text-blue-700 border-blue-100' 
                            : h.tip === 'TAHSILAT'
                            ? 'bg-green-50 text-green-700 border-green-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {h.tip === 'SIPARIS' ? 'Sipariş' : h.tip === 'TAHSILAT' ? 'Tahsilat' : 'Devir'}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-[200px]">
                        <p className="font-bold text-slate-800 text-sm leading-tight">{h.aciklama}</p>
                        {h.urunler && h.urunler.length > 0 && (
                          <div className="mt-2 space-y-1.5 border-l-2 border-slate-100 pl-3 py-1">
                            {h.urunler.map((u, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-500 group">
                                {u.resim ? (
                                  <img src={u.resim} alt={u.ad} className="h-8 w-8 object-contain rounded border border-slate-100 bg-white" />
                                ) : (
                                  <div className="h-8 w-8 bg-slate-50 rounded flex items-center justify-center text-[10px] text-slate-300 font-black">?</div>
                                )}
                                <div className="flex flex-col">
                                   <div className="flex items-center">
                                      {u.kod && <span className="font-black text-blue-600 mr-2 border border-blue-100 bg-blue-50 px-1 rounded-[4px] leading-tight text-[9px]">{u.kod}</span>}
                                      <span className="font-bold text-slate-700">{u.ad}</span>
                                   </div>
                                   <span className="text-[10px] font-medium opacity-70">{u.miktar} AD x {formatCurrency(u.birimFiyat)} = <b>{formatCurrency(u.toplam || (u.miktar*u.birimFiyat))}</b></span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {h.odemeYontemi && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                             <span className="bg-slate-100 text-[10px] font-black text-slate-500 px-1.5 py-0.5 rounded uppercase">{h.odemeYontemi}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-red-600 tabular-nums">
                        {h.borc > 0 ? formatCurrency(h.borc) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-green-700 tabular-nums">
                        {h.alacak > 0 ? formatCurrency(h.alacak) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900 tabular-nums">
                        {formatCurrency(h.bakiye)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50/50 print:bg-transparent">
                  <tr>
                    <td className="px-4 py-5 font-black text-slate-600 text-[10px] uppercase tracking-widest" colSpan={5}>Dönem Toplamları</td>
                    <td className="px-4 py-5 text-right font-black text-red-600 tabular-nums text-lg border-t-2 border-red-100">
                      {formatCurrency(data.ozet.toplamBorc)}
                    </td>
                    <td className="px-4 py-5 text-right font-black text-green-700 tabular-nums text-lg border-t-2 border-green-100">
                      {formatCurrency(data.ozet.toplamAlacak)}
                    </td>
                    <td className="px-4 py-5 text-right font-black text-slate-900 tabular-nums text-xl border-t-4 border-slate-200">
                      {formatCurrency(data.ozet.bakiye)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Özet Kartları - Alt - print gizle */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden pb-10">
        <Card className="bg-slate-50 border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Açılış Bakiyesi</p>
            <p className={`text-lg font-black tabular-nums ${data.ozet.acilisBakiyesi > 0 ? 'text-red-600' : 'text-green-700'}`}>
              {formatCurrency(data.ozet.acilisBakiyesi)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-red-50/30 border-red-100 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Toplam Satış</p>
            <p className="text-lg font-black tabular-nums text-red-600">{formatCurrency(data.ozet.toplamBorc)}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50/30 border-green-100 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">Toplam Tahsilat</p>
            <p className="text-lg font-black tabular-nums text-green-700">{formatCurrency(data.ozet.toplamAlacak)}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 shadow-lg ring-4 ring-slate-100">
          <CardContent className="p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Güncel Bakiye</p>
            <p className={`text-lg font-black tabular-nums ${data.ozet.bakiye > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {formatCurrency(data.ozet.bakiye)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
