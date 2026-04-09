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
    <div className="flex flex-col h-full bg-white w-full border-t lg:border-t-0">
      <div className="p-4 border-b bg-gray-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Takip Listesi</h2>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{reminders.length} Bekleyen Kayıt</p>
            </div>
          </div>
          
          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar shrink-0">
            {(['ALL', 'LATE', 'TODAY', 'UPCOMING'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold rounded-lg border whitespace-nowrap transition-all shadow-sm",
                  filter === f 
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                {f === 'ALL' ? 'Tümü' : f === 'TODAY' ? 'Bugün' : f === 'UPCOMING' ? 'Yakında' : 'Geciken'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
            <p className="text-xs text-gray-400 font-medium">Yükleniyor...</p>
          </div>
        ) : filteredReminders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200">
              <Check className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Harika!</h3>
            <p className="text-xs text-gray-500 max-w-[200px] mx-auto">Şu anda aranması gereken herhangi bir müşteri bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredReminders.map((r) => (
              <div key={r.id} className={cn(
                "group relative rounded-2xl border p-4 space-y-3 transition-all hover:shadow-xl hover:-translate-y-0.5",
                getStatusColor(r.reminderAt).split(' ').slice(0, 3).join(' ') // Get colors but skip some border classes
              )}>
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate uppercase tracking-tight text-gray-900 group-hover:text-blue-700 transition-colors">
                      {r.customer?.user?.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      <p className="text-[10px] text-gray-500 font-medium">Sipariş: #{r.id.slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                  {new Date(r.reminderAt).getTime() < now.getTime() && (
                    <span className="shrink-0 bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase shadow-sm">Gecikmiş</span>
                  )}
                </div>

                {r.reminderNote ? (
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 text-[11px] font-medium text-gray-700 border border-black/5 shadow-inner">
                   <p className="italic leading-relaxed line-clamp-3">"{r.reminderNote}"</p>
                  </div>
                ) : (
                  <div className="h-[52px] flex items-center justify-center border border-dashed border-black/5 rounded-xl text-[10px] text-gray-400 italic">
                    Not girilmemiş
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-black/5 mt-auto">
                  <div className="flex flex-col">
                    <p className="text-[9px] text-gray-500 font-bold uppercase">Hatırlatma</p>
                    <p className="text-xs font-black">
                      {new Date(r.reminderAt).getTime() === now.getTime() ? 'BUGÜN' : formatDate(r.reminderAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 rounded-xl bg-white text-green-600 hover:bg-green-600 hover:text-white transition-all border border-green-100 shadow-sm"
                      onClick={() => markAsDone(r.id)}
                      title="Arandı olarak işaretle"
                    >
                      <Check className="h-5 w-5" />
                    </Button>
                    {r.customer?.phone && (
                      <a
                        href={`tel:${r.customer.phone}`}
                        className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all shadow-md shadow-blue-200"
                        title="Müşteriyi Ara"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
