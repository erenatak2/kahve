'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

export default function CariHesapPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchCariHesap()
  }, [params.id])

  const fetchCariHesap = async () => {
    setLoading(true)
    let url = `/api/musteriler/${params.id}/cari`
    if (startDate || endDate) {
      const query = new URLSearchParams()
      if (startDate) query.set('startDate', startDate)
      if (endDate) query.set('endDate', endDate)
      url += `?${query.toString()}`
    }
    
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
    
    // XLSX formatinda hazirla
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
    
    // Toplam satiri ekle
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
    
    // Workbook olustur
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    
    // Sütun genişlikleri
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 12 },  // Tarih
      { wch: 15 },  // Evrak No
      { wch: 10 },  // Tür
      { wch: 30 },  // Açıklama
      { wch: 12 },  // Borç
      { wch: 12 },  // Alacak
      { wch: 12 }   // Bakiye
    ]
    
    XLSX.utils.book_append_sheet(wb, ws, 'Cari Hesap')
    XLSX.writeFile(wb, `cari-hesap-${data.musteri.ad}-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!data?.musteri) {
    return (
      <div className="p-8 text-center text-gray-500">
        Müşteri bilgisi yüklenemedi
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 print:p-0">
      {/* Header - print gizle */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Geri
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Cari Hesap Dökümü</h1>
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

      {/* Müşteri Bilgileri */}
      <Card className="print:border-0 print:shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{data.musteri.ad}</h2>
              <p className="text-sm text-gray-500">{data.musteri.email}</p>
              {data.musteri.telefon && <p className="text-sm text-gray-500">Tel: {data.musteri.telefon}</p>}
              {data.musteri.adres && <p className="text-sm text-gray-500">{data.musteri.adres}</p>}
              {data.musteri.vergiNo && <p className="text-sm text-gray-500">Vergi No: {data.musteri.vergiNo}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Dönem: {data.donem.baslangic ? formatDate(data.donem.baslangic) : 'Tümü'} - {data.donem.bitis ? formatDate(data.donem.bitis) : 'Günümüz'}</p>
              <p className="text-sm text-gray-500">Hareket Sayısı: {data.ozet.hareketSayisi}</p>
              {data.ozet.acilisBakiyesi !== 0 && (
                <p className="text-sm text-gray-500">Açılış Bakiyesi: {formatCurrency(data.ozet.acilisBakiyesi)}</p>
              )}
              <p className={`text-xl font-bold ${data.ozet.bakiye > 0 ? 'text-red-600' : 'text-green-600'}`}>
                Bakiye: {formatCurrency(data.ozet.bakiye)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tarih Filtresi - print gizle */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <input
          type="date"
          className="border rounded px-3 py-2 text-sm"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder="Başlangıç"
        />
        <input
          type="date"
          className="border rounded px-3 py-2 text-sm"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder="Bitiş"
        />
        <Button variant="outline" size="sm" onClick={fetchCariHesap}>
          Filtrele
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate(''); fetchCariHesap() }}>
          Temizle
        </Button>
      </div>

      {/* Cari Hesap Tablosu */}
      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="print:hidden">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Hesap Hareketleri
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.hareketler?.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Bu dönemde hesap hareketi bulunmamaktadır.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 print:bg-transparent">
                    <th className="px-3 py-3 text-left font-semibold text-gray-700 w-12">No</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Tarih</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Evrak No</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Tür</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-700">Açıklama</th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-700 text-red-600">Borç</th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-700 text-green-600">Alacak</th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-700">Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hareketler?.map((h: Hareket, i: number) => (
                    <tr key={i} className={`border-b hover:bg-gray-50 print:hover:bg-transparent ${h.acilis ? 'bg-yellow-50' : ''}`}>
                      <td className="px-3 py-3 text-gray-500 text-xs">{h.siraNo}</td>
                      <td className="px-3 py-3 text-gray-600">{formatDate(h.tarih)}</td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-500">{h.evrakNo}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          h.tip === 'SIPARIS' 
                            ? 'bg-blue-100 text-blue-700' 
                            : h.tip === 'TAHSILAT'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {h.tip === 'SIPARIS' ? 'Sipariş' : h.tip === 'TAHSILAT' ? 'Tahsilat' : 'Devir'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium">{h.aciklama}</p>
                        {h.urunler && h.urunler.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {h.urunler.map((u, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                                {u.resim ? (
                                  <img src={u.resim} alt={u.ad} className="h-8 w-8 object-contain rounded border" />
                                ) : (
                                  <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center text-[10px]">No</div>
                                )}
                                <div>
                                  {u.kod && <span className="font-mono text-blue-600 mr-1">[{u.kod}]</span>}
                                  <span>{u.miktar}x {u.ad}</span>
                                  <span className="text-gray-400 ml-1">({formatCurrency(u.birimFiyat)})</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {h.odemeYontemi && (
                          <p className="text-xs text-gray-500 mt-1">Ödeme: {h.odemeYontemi}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-red-600">
                        {h.borc > 0 ? formatCurrency(h.borc) : '-'}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-green-600">
                        {h.alacak > 0 ? formatCurrency(h.alacak) : '-'}
                      </td>
                      <td className="px-3 py-3 text-right font-bold">
                        {formatCurrency(h.bakiye)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 print:bg-transparent">
                  <tr className="border-t-2">
                    <td className="px-3 py-3 font-bold" colSpan={5}>TOPLAM</td>
                    <td className="px-3 py-3 text-right font-bold text-red-600">
                      {formatCurrency(data.ozet.toplamBorc)}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-green-600">
                      {formatCurrency(data.ozet.toplamAlacak)}
                    </td>
                    <td className="px-3 py-3 text-right font-bold">
                      {formatCurrency(data.ozet.bakiye)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Özet Kartı - print gizle */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        {data.ozet.acilisBakiyesi !== 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Açılış Bakiyesi</p>
              <p className={`text-xl font-bold ${data.ozet.acilisBakiyesi > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(data.ozet.acilisBakiyesi)}
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Toplam Borç</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(data.ozet.toplamBorc)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Toplam Tahsilat</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(data.ozet.toplamAlacak)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Güncel Borç</p>
            <p className={`text-xl font-bold ${data.ozet.bakiye > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(data.ozet.bakiye)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
