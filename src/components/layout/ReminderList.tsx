'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, Phone, Plus, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

export default function ReminderList() {
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'TODAY' | 'UPCOMING' | 'LATE'>('ALL')
  const { toast } = useToast()

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
    // 1 dakikada bir güncelle
    const interval = setInterval(fetchReminders, 60000)
    return () => clearInterval(interval)
  }, [])

  const markAsDone = async (orderId: string) => {
    const res = await fetch('/api/admin/reminders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, followupStatus: 'ARANDI' })
    })
    if (res.ok) {
      toast({ title: 'Müşteri arandı olarak işaretlendi' })
      fetchReminders()
    }
  }

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  const filteredReminders = reminders.filter(r => {
    const reminderDate = new Date(r.reminderAt)
    reminderDate.setHours(0, 0, 0, 0)

    if (filter === 'TODAY') return reminderDate.getTime() === now.getTime()
    if (filter === 'LATE') return reminderDate.getTime() < now.getTime()
    if (filter === 'UPCOMING') return reminderDate.getTime() > now.getTime()
    return true
  })

  const getStatusColor = (dateStr: string) => {
    const d = new Date(dateStr)
    d.setHours(0, 0, 0, 0)
    if (d.getTime() < now.getTime()) return 'text-red-600 bg-red-50 border-red-100' // Gecikmiş
    if (d.getTime() === now.getTime()) return 'text-amber-600 bg-amber-50 border-amber-100' // Bugün
    return 'text-blue-600 bg-blue-50 border-blue-100' // Gelecek
  }

  return (
    <div className="flex flex-col h-full bg-white w-full border-t">
      <div className="p-4 border-b bg-gray-50/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-600" />
            <h2 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Aranacaklar</h2>
          </div>
          <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {reminders.length}
          </span>
        </div>
        
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {(['ALL', 'LATE', 'TODAY', 'UPCOMING'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-2 py-1 text-[9px] font-bold rounded-md border whitespace-nowrap transition-all",
                filter === f 
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              )}
            >
              {f === 'ALL' ? 'Tümü' : f === 'TODAY' ? 'Bugün' : f === 'UPCOMING' ? 'Yakında' : 'Geciken'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[400px]">
        {loading ? (
          <div className="flex justify-center py-4"><div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" /></div>
        ) : filteredReminders.length === 0 ? (
          <div className="text-center py-6 px-2">
            <p className="text-[10px] text-gray-400 font-medium">Bu kategoride kayıt yok.</p>
          </div>
        ) : (
          filteredReminders.map((r) => (
            <div key={r.id} className={cn("rounded-lg border p-2.5 space-y-1.5 transition-all hover:shadow-sm", getStatusColor(r.reminderAt))}>
              <div className="flex justify-between items-start gap-1">
                <div className="min-w-0">
                  <p className="font-bold text-[11px] truncate uppercase leading-tight">{r.customer?.user?.name}</p>
                  <p className="text-[9px] opacity-70 font-medium">Sipariş: {r.id.slice(-6).toUpperCase()}</p>
                </div>
                {new Date(r.reminderAt).getTime() < now.getTime() && (
                  <span className="shrink-0 bg-red-500 text-white text-[8px] px-1 py-0.5 rounded font-black uppercase">!</span>
                )}
              </div>

              {r.reminderNote && (
                <p className="text-[10px] leading-tight line-clamp-2 opacity-90 border-l-2 border-current pl-1.5 py-0.5 italic">
                  {r.reminderNote}
                </p>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-black/5">
                <p className="text-[9px] font-bold uppercase">
                  {new Date(r.reminderAt).getTime() === now.getTime() ? 'BUGÜN' : formatDate(r.reminderAt)}
                </p>
                <div className="flex gap-1">
                  <button
                    className="h-6 w-6 rounded bg-green-100 text-green-700 flex items-center justify-center hover:bg-green-600 hover:text-white transition-colors"
                    onClick={() => markAsDone(r.id)}
                    title="Arandı"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  {r.customer?.phone && (
                    <a
                      href={`tel:${r.customer.phone}`}
                      className="h-6 w-6 rounded bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm"
                      title="Ara"
                    >
                      <Phone className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
