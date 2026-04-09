'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Phone, Check, Search } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'

export default function TakipPage() {
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
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

  const filtered = reminders.filter((r: any) => 
    r.customer?.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.reminderNote?.toLowerCase().includes(search.toLowerCase())
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
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
                        isLate(r.reminderAt) ? "bg-red-100 text-red-600" : isToday(r.reminderAt) ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {r.customer?.user?.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{r.customer?.user?.name}</p>
                        <p className="text-[10px] text-gray-400 leading-none">Sipariş: #{r.id.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {r.customer?.phone || '-'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="max-w-[200px] text-xs text-gray-500 italic truncate">
                      {r.reminderNote || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full",
                      isLate(r.reminderAt) ? "bg-red-50 text-red-600" : isToday(r.reminderAt) ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {isToday(r.reminderAt) ? 'BUGÜN' : formatDate(r.reminderAt)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                       {r.customer?.phone && (
                        <a
                          href={`tel:${r.customer.phone}`}
                          className="h-8 w-8 rounded-md bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm"
                          title="Ara"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 gap-1 border-green-200 text-green-700 hover:bg-green-50"
                        onClick={() => markAsDone(r.id)}
                      >
                        <Check className="h-4 w-4" />
                        <span className="hidden sm:inline text-xs font-bold">Arandı</span>
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
