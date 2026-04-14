'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Phone, Check, Search, MessageCircle, AlertCircle, X, Save } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'

const WHATSAPP_TEMPLATES = [
  { label: 'Genel Hatırlatma', text: (name: string) => `Merhaba ${name}, sizi aramıştım. Müsait olduğunuzda dönebilir misiniz?` },
  { label: 'Sipariş Bilgisi', text: (name: string) => `Merhaba ${name}, kahve siparişiniz için bilgi almak istedim.` },
  { label: 'Takip Araması', text: (name: string) => `Merhaba ${name}, geçen görüşmemizde söz vermiştiniz, hatırlatmak istedim.` },
]

const OUTCOMES = [
  { value: 'GORUSTUK', label: '✅ Görüştük', color: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' },
  { value: 'ULASAMADIK', label: '📵 Ulaşamadık', color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' },
  { value: 'MESAJ_BIRAKTIK', label: '💬 Mesaj Bıraktık', color: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200' },
]

export default function TakipPage() {
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingDates, setEditingDates] = useState<Record<string, string>>({})
  const [whatsappMenu, setWhatsappMenu] = useState<string | null>(null)
  
  // Arama Notu Modalı
  const [callModal, setCallModal] = useState<{ item: any } | null>(null)
  const [callNote, setCallNote] = useState('')
  const [callOutcome, setCallOutcome] = useState('GORUSTUK')
  const [saving, setSaving] = useState(false)

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
    const interval = setInterval(fetchReminders, 30000)
    return () => clearInterval(interval)
  }, [])

  const openCallModal = (item: any) => {
    setCallModal({ item })
    setCallNote('')
    setCallOutcome('GORUSTUK')
  }

  const saveCallLog = async () => {
    if (!callModal) return
    setSaving(true)
    try {
      const r = callModal.item
      const res = await fetch('/api/admin/call-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: r.customerId,
          note: callNote,
          outcome: callOutcome,
          type: r.type,
          relatedId: r.type === 'ORDER' ? r.id : undefined
        })
      })
      if (res.ok) {
        toast({ title: '✅ Arama kaydedildi', description: 'Konuşma geçmişe eklendi.' })
        setCallModal(null)
        fetchReminders()
      }
    } catch {
      toast({ title: 'Hata', variant: 'destructive' })
    }
    setSaving(false)
  }

  const updateDate = async (customerId: string, newDate: string) => {
    if (!newDate) return
    try {
      const res = await fetch('/api/admin/takip', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, date: newDate })
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

  const openWhatsApp = (phone: string, name: string, template: (n: string) => string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    const fullPhone = cleanPhone.startsWith('0') ? '90' + cleanPhone.slice(1) : cleanPhone.startsWith('90') ? cleanPhone : '90' + cleanPhone
    const text = encodeURIComponent(template(name.split(' ')[0]))
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank')
    setWhatsappMenu(null)
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
          <Input className="pl-9 bg-white" placeholder="Müşteri veya not ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-2">
            <Check className="h-10 w-10 text-green-400 mx-auto" />
            <p className="text-gray-500 text-sm font-medium">Harika! Bekleyen arama kaydı bulunamadı.</p>
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
                      <div className="flex items-center gap-1">
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
                        {isLate(r.date) && (
                          <span className="flex items-center gap-0.5 text-[9px] text-red-500 font-bold uppercase animate-pulse">
                            <AlertCircle className="h-2.5 w-2.5" /> Gecikti
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5 relative">
                      {r.phone && (
                        <>
                          <div className="relative">
                            <button
                              onClick={() => setWhatsappMenu(whatsappMenu === r.id ? null : r.id)}
                              className="h-8 w-8 rounded-md bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors shadow-sm"
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                            {whatsappMenu === r.id && (
                              <div className="absolute right-0 top-9 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-2 w-52 space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase px-2 pb-1">Şablon Seç</p>
                                {WHATSAPP_TEMPLATES.map((tpl, i) => (
                                  <button
                                    key={i}
                                    onClick={() => openWhatsApp(r.phone, r.customerName, tpl.text)}
                                    className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-green-50 text-gray-700 hover:text-green-700 transition-colors"
                                  >
                                    {tpl.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <a
                            href={`tel:${r.phone}`}
                            className="h-8 w-8 rounded-md bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm"
                            title="Ara"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 gap-1.5 border-green-200 text-green-700 hover:bg-green-500 hover:text-white transition-all font-bold"
                        onClick={() => openCallModal(r)}
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

      {/* ===== ARAMA NOTU MODALI ===== */}
      {callModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setCallModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Arama Notu</h2>
                <p className="text-sm text-gray-500">{callModal.item.customerName}</p>
              </div>
              <button onClick={() => setCallModal(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Arama Sonucu</p>
              <div className="grid grid-cols-3 gap-2">
                {OUTCOMES.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setCallOutcome(o.value)}
                    className={cn(
                      "text-xs font-bold py-2.5 px-2 rounded-xl border-2 transition-all text-center",
                      callOutcome === o.value ? o.color + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Ne Konuşuldu?</p>
              <textarea
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                rows={4}
                placeholder="Örn: Fiyatı pahalı buldu, bir sonraki siparişinde indirim istedi. 2 hafta sonra tekrar aranacak."
                value={callNote}
                onChange={e => setCallNote(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCallModal(null)}>İptal</Button>
              <Button
                className="flex-[2] bg-green-600 hover:bg-green-700 text-white font-bold gap-2"
                onClick={saveCallLog}
                disabled={saving}
              >
                {saving ? (
                  <span className="animate-pulse">Kaydediliyor...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Aramayı Tamamla & Kaydet
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
