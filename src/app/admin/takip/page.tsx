'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Phone, Check, Search, Calendar } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'

export default function TakipPage() {
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchParams = useSearchParams()
  const filter = searchParams.get('filter') || 'tümü'
  const { toast } = useToast()
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

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
    const interval = setInterval(fetchReminders, 30000)
    return () => clearInterval(interval)
  }, [])

  const markAsDone = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reminders?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARANDI' })
      })

      if (res.ok) {
        toast({ title: 'Başarılı', description: 'Müşteri arandı olarak işaretlendi.' })
        fetchReminders()
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Güncelleme yapılamadı.', variant: 'destructive' })
    }
  }

  const isLate = (dateStr: string) => {
    const d = new Date(dateStr)
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    return dateOnly < today
  }
  
  const isTodayFunc = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }

  const filtered = reminders.filter((r: any) => {
    const matchesSearch = r.customer?.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
                         r.reminderNote?.toLowerCase().includes(search.toLowerCase())
    
    if (!matchesSearch) return false

    if (filter === 'geciken') return isLate(r.reminderAt)
    if (filter === 'bugün') return isTodayFunc(r.reminderAt)
    if (filter === 'yakında') return !isLate(r.reminderAt) && !isTodayFunc(r.reminderAt)
    
    return true
  })

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Aranacaklar</h1>
            <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
              {filter}
            </span>
          </div>
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
            Bu kategoride bekleyen kayıt bulunamadı
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-gray-900">Müşteri</TableHead>
                <TableHead className="hidden md:table-cell font-bold text-gray-900">İletişim</TableHead>
                <TableHead className="hidden lg:table-cell font-bold text-gray-900">Takip Notu</TableHead>
                <TableHead className="text-right font-bold text-gray-900">Hatırlatma</TableHead>
                <TableHead className="text-right font-bold text-gray-900">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r: any) => (
                <TableRow key={r.id} className="hover:bg-gray-50/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm",
                        isLate(r.reminderAt) ? "bg-red-100 text-red-600" : isTodayFunc(r.reminderAt) ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {r.customer?.user?.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{r.customer?.user?.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">#{r.id.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="text-sm text-gray-600">{r.customer?.phone || '-'}</div>
                    <div className="text-[10px] text-gray-400">{r.customer?.user?.email}</div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="max-w-[250px] text-xs text-gray-500 italic line-clamp-1">
                      {r.reminderNote || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                      isLate(r.reminderAt) ? "bg-red-50 text-red-600" : isTodayFunc(r.reminderAt) ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                    )}>
                      <Calendar className="h-3 w-3" />
                      {isTodayFunc(r.reminderAt) ? 'Bugün' : formatDate(r.reminderAt)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                       {r.customer?.phone && (
                        <a
                          href={`tel:${r.customer.phone}`}
                          className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 shadow-sm"
                          title="Ara"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 gap-1.5 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 transition-all font-bold text-[11px] uppercase tracking-tighter"
                        onClick={() => markAsDone(r.id)}
                      >
                        <Check className="h-4 w-4" />
                        <span className="hidden sm:inline">Arandı</span>
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
