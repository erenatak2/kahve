'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Phone, Check, Search } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Calendar as CalendarIcon, Save } from 'lucide-react'

export default function TakipPage() {
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingDates, setEditingDates] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const now = new Date()

  const fetchReminders = async () => {
    try {
      const res = await fetch('/api/admin/reminders')
      if (res.ok) {
        const data = await res.json()
        setReminders(data)
      }
    } catch (error) {
      console.error('Fetch reminders error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReminders()
    
    // Refresh interval
    const interval = setInterval(fetchReminders, 30000)
    return () => clearInterval(interval)
  }, [])

  const markAsDone = async (id: string, type: 'CUSTOMER' | 'ORDER') => {
    try {
      const res = await fetch(`/api/admin/reminders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type, status: 'ARANDI' })
      })

      if (res.ok) {
        toast({ title: 'Başarılı', description: 'Takip tamamlandı.' })
        fetchReminders()
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Güncelleme yapılamadı.', variant: 'destructive' })
    }
  }

  const updateDate = async (customerId: string, newDate: string) => {
    if (!newDate) return
    try {
      const res = await fetch('/api/admin/takip', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customerId, 
          days: Math.ceil((new Date(newDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        })
      })
      if (res.ok) {
        toast({ title: 'Tarih güncellendi' })
        setEditingDates(prev => {
          const next = { ...prev }
          delete next[customerId]
          return next
        })
        fetchReminders()
      }
    } catch {
      toast({ title: 'Hata', variant: 'destructive' })
    }
  }

  const filtered = reminders.filter((r: any) => 
    r.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    r.note?.toLowerCase().includes(search.toLowerCase())
  )

  const isLate = (date: string) => new Date(date).getTime() < now.getTime()
  const isToday = (date: string) => {
    const d = new Date(date)
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Aranacaklar</h1>
          <p className="text-gray-500 text-sm">Takip süresi gelen müşterilerin listesi</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input 
            className="pl-9 bg-white" 
            placeholder="Müşteri veya not ara..." 
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
        <Card>
          <CardContent className="py-16 text-center text-gray-500 text-sm italic">
            Aranması gereken müsait kayıt bulunamadı
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Müşteri</TableHead>
                <TableHead className="hidden md:table-cell">İletişim</TableHead>
                <TableHead className="hidden lg:table-cell">Takip Notu</TableHead>
                <TableHead className="text-right">Hatırlatma</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm",
                        isLate(r.date) ? "bg-red-500 text-white" : isToday(r.date) ? "bg-orange-500 text-white" : "bg-blue-500 text-white"
                      )}>
                        {r.customerName?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{r.customerName}</p>
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded font-black uppercase",
                          r.type === 'CUSTOMER' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {r.type === 'CUSTOMER' ? 'DÜZENLİ TAKİP' : 'SİPARİŞ NOTU'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm font-medium text-gray-600">
                    {r.phone || '-'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="max-w-[200px] text-xs text-gray-500 italic">
                      {r.note || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1 group">
                        <Input 
                          type="date"
                          className="h-8 w-32 text-xs p-1 bg-white border-gray-200"
                          value={editingDates[r.customerId] || new Date(r.date).toISOString().split('T')[0]}
                          onChange={e => setEditingDates(prev => ({ ...prev, [r.customerId]: e.target.value }))}
                        />
                        {editingDates[r.customerId] && (
                          <Button 
                            size="sm" 
                            className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 shadow-sm"
                            onClick={() => updateDate(r.customerId, editingDates[r.customerId])}
                          >
                            <Save className="h-4 w-4 text-white" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded-full",
                          isLate(r.date) ? "bg-red-100 text-red-600" : isToday(r.date) ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                        )}>
                          {isToday(r.date) ? 'BUGÜN' : formatDate(r.date)}
                        </span>
                        {isLate(r.date) && <span className="text-[9px] text-red-500 font-bold uppercase animate-pulse">Gecikti!</span>}
                      </div>
                    </div>
                  </TableCell>
                   <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                       {r.phone && (
                        <a
                          href={`tel:${r.phone}`}
                          className="h-8 w-8 rounded-md bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm"
                          title="Ara"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 gap-1.5 border-green-200 text-green-700 hover:bg-green-500 hover:text-white transition-all font-bold"
                        onClick={() => markAsDone(r.id, r.type)}
                      >
                        <Check className="h-4 w-4" />
                        <span className="hidden sm:inline text-xs">Arandı</span>
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
