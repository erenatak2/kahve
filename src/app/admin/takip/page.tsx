'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Phone, Check, Search, Calendar, MessageSquare } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'

export default function TakipPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { toast } = useToast()
  const now = new Date()

  const fetchFollowUps = async () => {
    try {
      const res = await fetch('/api/musteriler')
      if (res.ok) {
        const data = await res.json()
        // Sadece takip süresi gelmiş (bugün veya geçmiş) ve ARANDI olarak işaretlenmemiş olanları filtrele
        const filteredData = data.filter((c: any) => 
          c.nextCallDate && 
          c.followUpStatus === 'BEKLIYOR' &&
          new Date(c.nextCallDate).getTime() <= now.getTime()
        )
        setCustomers(filteredData)
      }
    } catch (error) {
      console.error('Fetch follow-ups error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFollowUps()
  }, [])

  const markAsCalled = async (customerId: string) => {
    try {
      const res = await fetch('/api/musteriler/takip', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, status: 'ARANDI' })
      })

      if (res.ok) {
        toast({ title: 'Başarılı', description: 'Müşteri arandı olarak işaretlendi.' })
        fetchFollowUps()
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Güncelleme yapılamadı.', variant: 'destructive' })
    }
  }

  const filtered = customers.filter((c: any) => 
    c.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.businessName?.toLowerCase().includes(search.toLowerCase())
  )

  const isLate = (date: string) => {
    const d = new Date(date)
    d.setHours(0,0,0,0)
    const t = new Date()
    t.setHours(0,0,0,0)
    return d.getTime() < t.getTime()
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Phone className="h-6 w-6 text-blue-600" />
            Günün Arama Listesi (Takip)
          </h1>
          <p className="text-gray-500 text-sm">Süresi dolan ve bugün aranması gereken müşteriler</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input 
            className="pl-9 bg-white shadow-sm" 
            placeholder="Müşteri ara..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-20 text-center text-gray-500 text-sm flex flex-col items-center gap-3">
            <div className="bg-gray-50 p-4 rounded-full">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <p className="font-medium text-base">Tebrikler! Bugünlük tüm aramalar tamamlandı.</p>
            <p className="text-xs">Aranması gereken gecikmiş bir kayıt bulunmuyor.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm overflow-hidden border-orange-100">
          <div className="bg-orange-50 border-b border-orange-100 px-4 py-2">
             <p className="text-[10px] font-bold text-orange-700 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                {filtered.length} Müşteri Bekliyor
             </p>
          </div>
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="font-bold">Müşteri / İşletme</TableHead>
                <TableHead className="hidden md:table-cell font-bold text-center">İletişim</TableHead>
                <TableHead className="text-right font-bold">Planlanan Tarih</TableHead>
                <TableHead className="text-right font-bold">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => (
                <TableRow key={c.id} className="hover:bg-gray-50/80 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm",
                        isLate(c.nextCallDate) ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {(c.businessName || c.user?.name)?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-tight">{c.businessName || 'Şahıs Kaydı'}</p>
                        <p className="text-xs text-gray-500">{c.user?.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center font-medium text-gray-600">
                    {c.phone || '-'}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    <span className={cn(
                      "px-2 py-1 rounded-lg font-bold border",
                      isLate(c.nextCallDate) 
                        ? "bg-red-50 text-red-700 border-red-100" 
                        : "bg-blue-50 text-blue-700 border-blue-100"
                    )}>
                      {formatDate(c.nextCallDate)}
                    </span>
                    {isLate(c.nextCallDate) && (
                      <p className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-tighter">Gecikmiş Arama!</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                       {c.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all shadow-md active:scale-95"
                          title="Ara"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-4 gap-2 border-green-200 text-green-700 hover:bg-green-50 font-bold rounded-xl shadow-sm"
                        onClick={() => markAsCalled(c.id)}
                      >
                        <Check className="h-4 w-4" />
                        ARANDI
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
