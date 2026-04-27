'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Phone, Check, Search, MessageCircle, AlertCircle, X, Save, MapPin, History, ArrowRight, ArrowDownAz, Clock, RotateCcw } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

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

interface TakipClientProps {
  initialReminders: any[]
  session: any
}

export default function TakipClient({ initialReminders, session }: TakipClientProps) {
  const [reminders, setReminders] = useState<any[]>(initialReminders)
  const [loading, setLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('Tümü')
  const [editingDates, setEditingDates] = useState<Record<string, string>>({})
  const [whatsappMenu, setWhatsappMenu] = useState<string | null>(null)

  const [callModal, setCallModal] = useState<{ item: any } | null>(null)
  const [callNote, setCallNote] = useState('')
  const [callOutcome, setCallOutcome] = useState('GORUSTUK')
  const [saving, setSaving] = useState(false)
  const [callHistory, setCallHistory] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [sortBy, setSortBy] = useState<'date-desc' | 'name-asc' | 'name-desc'>('date-desc')

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

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/admin/call-log')
      if (res.ok) {
        const data = await res.json()
        setCallHistory(data)
      }
    } catch (error) {
      console.error('Fetch history error:', error)
    }
  }

  useEffect(() => {
    // Sayfa açıldığında hemen verileri çek
    const loadData = async () => {
      await Promise.all([fetchReminders(), fetchHistory()])
      setIsInitialLoad(false)
    }
    loadData()

    const interval = setInterval(() => {
      fetchReminders()
      if (activeTab === 'history') fetchHistory()
    }, 30000)
    return () => clearInterval(interval)
  }, [activeTab])

  const openCallModal = (item: any) => {
    setCallModal({ item })
    setCallNote('')
    setCallOutcome('GORUSTUK')
  }

  const clearReminder = async (item: any) => {
    try {
      const res = await fetch('/api/admin/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, type: item.type, clearReminder: true })
      })
      if (res.ok) {
        toast({ title: 'Hatırlatıcı temizlendi' })
        fetchReminders()
      } else {
        toast({ title: 'Hata', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Hata', variant: 'destructive' })
    }
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
          customerId: r.type === 'CUSTOMER' || r.type === 'ORDER' ? r.customerId : undefined,
          contactId: r.type === 'CONTACT' ? r.id : undefined,
          note: callNote,
          outcome: callOutcome,
          type: r.type,
          relatedId: (r.type === 'ORDER' || r.type === 'CONTACT') ? r.id : undefined
        })
      })
      if (res.ok) {
        toast({ title: '✅ Arama kaydedildi', description: 'Konuşma geçmişe eklendi.' })
        setCallModal(null)
        fetchReminders()
        fetchHistory()
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

  const filtered = reminders
    .filter((r: any) => {
      const matchesSearch = (r.customerName?.toLowerCase().includes(search.toLowerCase()) ||
                            r.note?.toLowerCase().includes(search.toLowerCase()))
      const matchesRegion = selectedRegion === 'Tümü' || r.region === selectedRegion
      return matchesSearch && matchesRegion
    })
    .sort((a, b) => {
      if (sortBy === 'name-asc') return (a.customerName || '').localeCompare(b.customerName || '')
      if (sortBy === 'name-desc') return (b.customerName || '').localeCompare(a.customerName || '')
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    })

  const regions = ['Tümü', ...Array.from(new Set(reminders.map((r: any) => r.region).filter(Boolean).sort()))]

  const isLate = (date: string) => new Date(date).getTime() < now.getTime()
  const isToday = (date: string) => {
    const d = new Date(date)
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Müşteri Takip Sistemi</h1>
          <p className="text-gray-500 text-sm">Bekleyen aramalar ve görüşme geçmişi</p>
        </div>
        
        {/* TABS */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              "px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
              activeTab === 'pending' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Phone className="h-4 w-4" />
            Bekleyenler
            {reminders.length > 0 && (
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {reminders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
              activeTab === 'history' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <History className="h-4 w-4" />
            Geçmiş
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-56">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <select 
              className="pl-9 w-full h-10 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              {regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="relative w-full md:w-48">
            <ArrowDownAz className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <select 
              className="pl-9 w-full h-10 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="date-desc">En Yeni Tarih</option>
              <option value="name-asc">İsim (A-Z)</option>
              <option value="name-desc">İsim (Z-A)</option>
            </select>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input className="pl-9 bg-white h-10" placeholder="Müşteri veya not ara..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {isInitialLoad ? (
        <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50">
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b border-slate-100 last:border-0">
                <div className="h-10 w-10 rounded-xl bg-slate-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse" />
                  <div className="h-3 bg-slate-200 rounded w-1/4 animate-pulse" />
                </div>
                <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </Card>
      ) : activeTab === 'pending' ? (
        filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-2">
              <Check className="h-10 w-10 text-green-400 mx-auto" />
              <p className="text-gray-500 text-sm font-medium">Harika! Bekleyen arama kaydı bulunamadı.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-0">
                  <TableHead className="font-bold text-slate-800">Müşteri</TableHead>
                  <TableHead className="hidden sm:table-cell font-bold text-slate-800">Bölge</TableHead>
                  <TableHead className="hidden md:table-cell font-bold text-slate-800">İletişim</TableHead>
                  <TableHead className="hidden lg:table-cell font-bold text-slate-800">Takip Notu</TableHead>
                  <TableHead className="text-right font-bold text-slate-800">Hatırlatma</TableHead>
                  <TableHead className="text-right font-bold text-slate-800">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-sm text-white",
                          isLate(r.date) ? "bg-red-500" : isToday(r.date) ? "bg-orange-500" : "bg-blue-600"
                        )}>
                          {r.customerName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 leading-tight">{r.customerName}</p>
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded font-black uppercase w-fit inline-block mt-1",
                            r.type === 'CUSTOMER' ? "bg-purple-100 text-purple-700" : 
                            r.type === 'CONTACT' ? "bg-emerald-100 text-emerald-700" :
                            "bg-blue-100 text-blue-700"
                          )}>
                            {r.type === 'CUSTOMER' ? 'DÜZENLİ TAKİP' : 
                             r.type === 'CONTACT' ? 'YENİ KONTAK' : 
                             'SİPARİŞ NOTU'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {r.region ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full w-fit capitalize shadow-sm">
                          <MapPin className="h-3.5 w-3.5 text-orange-500" />
                          {r.region}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {r.phone ? (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm w-fit">
                          <Phone className="h-3.5 w-3.5" />
                          <span className="text-sm font-black tracking-tight">{r.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="max-w-[250px]">
                        <p className="text-xs text-slate-500 italic font-medium max-h-16 overflow-y-auto leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {r.note || 'Takip notu bulunmuyor.'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Input 
                            type="date"
                            className="h-9 w-36 text-xs p-2 bg-white border-slate-200 rounded-lg shadow-sm focus:ring-blue-500"
                            value={editingDates[r.customerId] || (r.date ? new Date(r.date).toISOString().split('T')[0] : '')}
                            onChange={e => setEditingDates(prev => ({ ...prev, [r.customerId]: e.target.value }))}
                          />
                          {editingDates[r.customerId] && (
                            <Button
                              size="sm"
                              className="h-9 w-9 p-0 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                              onClick={() => updateDate(r.customerId, editingDates[r.customerId])}
                            >
                              <Save className="h-4 w-4 text-white" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1.5",
                            isLate(r.date) ? "bg-red-50 text-red-600 border border-red-100" : isToday(r.date) ? "bg-orange-50 text-orange-600 border border-orange-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                          )}>
                            {isToday(r.date) ? 'BUGÜN' : r.date ? format(new Date(r.date), 'dd MMM yyyy', { locale: tr }) : '-'}
                            {r.date && (
                              <>
                                <span className="opacity-40">|</span>
                                <Clock className="h-3 w-3" />
                                {format(new Date(r.date), 'HH:mm')}
                              </>
                            )}
                          </span>
                          {isLate(r.date) && (
                            <span className="flex items-center gap-1 text-[10px] text-red-500 font-black uppercase animate-pulse">
                              <AlertCircle className="h-3 w-3" /> Gecikti
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.phone && (
                          <div className="relative">
                            <button
                              onClick={() => setWhatsappMenu(whatsappMenu === r.id ? null : r.id)}
                              className="h-9 w-9 rounded-xl bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-all shadow-lg shadow-green-200 active:scale-95"
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                            {whatsappMenu === r.id && (
                              <div className="absolute right-0 top-11 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 w-60 animate-in zoom-in-95 duration-200">
                                <p className="text-[10px] font-black text-slate-400 uppercase px-3 py-2 border-b border-slate-50 mb-1">HIZLI MESAJ GÖNDER</p>
                                {WHATSAPP_TEMPLATES.map((tpl, i) => (
                                  <button
                                    key={i}
                                    onClick={() => openWhatsApp(r.phone, r.customerName, tpl.text)}
                                    className="w-full text-left text-xs px-3 py-2.5 rounded-xl hover:bg-green-50 text-slate-700 hover:text-green-700 transition-colors font-medium flex items-center justify-between group"
                                  >
                                    {tpl.label}
                                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 px-4 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all font-black rounded-xl shadow-sm active:scale-95"
                          onClick={() => openCallModal(r)}
                        >
                          <Phone className="h-4 w-4" />
                          <span className="hidden sm:inline">ARANDI</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all rounded-xl"
                          onClick={() => clearReminder(r)}
                          title="Hatırlatıcıyı temizle"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      ) : (
        <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-0">
                <TableHead className="font-bold text-slate-800">Tarih</TableHead>
                <TableHead className="font-bold text-slate-800">Müşteri / Kontak</TableHead>
                <TableHead className="font-bold text-slate-800">Arayan</TableHead>
                <TableHead className="font-bold text-slate-800">Notlar</TableHead>
                <TableHead className="text-right font-bold text-slate-800">Sonuç</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {callHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-slate-400 italic font-medium">Henüz arama kaydı bulunmuyor.</TableCell>
                </TableRow>
              ) : (
                callHistory.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50 border-slate-100 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{format(new Date(log.calledAt), 'dd MMMM', { locale: tr })}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{format(new Date(log.calledAt), 'HH:mm')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800">
                          {log.customer?.businessName || log.customer?.user?.name || log.contact?.name || 'Bilinmeyen'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                          {log.customerId ? 'MÜŞTERİ' : 'KONTAK'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700 shadow-sm">
                          {log.calledByName?.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-slate-600">{log.calledByName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-slate-500 italic font-medium max-w-[250px] max-h-12 overflow-y-auto leading-relaxed">
                        {log.note || 'Not bırakılmadı'}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "text-[10px] font-black px-2.5 py-1 rounded-lg uppercase border shadow-sm",
                        log.outcome === 'GORUSTUK' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        log.outcome === 'ULASAMADIK' ? "bg-red-50 text-red-700 border-red-100" :
                        "bg-amber-50 text-amber-700 border-amber-100"
                      )}>
                        {OUTCOMES.find(o => o.value === log.outcome)?.label.split(' ')[1] || log.outcome}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ===== ARAMA NOTU MODALI ===== */}
      <Dialog open={!!callModal} onOpenChange={() => setCallModal(null)}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="bg-slate-900 text-white p-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Phone className="h-5 w-5 text-emerald-400" />
              Arama Sonucunu Kaydet
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">
              {callModal?.item?.customerName} ile yapılan görüşmeyi özetleyin.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-black text-slate-500 uppercase tracking-wider">ARAMA SONUCU</Label>
              <div className="grid grid-cols-1 gap-2">
                {OUTCOMES.map((outcome) => (
                  <button
                    key={outcome.value}
                    onClick={() => setCallOutcome(outcome.value)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 group text-left",
                      callOutcome === outcome.value
                        ? "border-blue-600 bg-blue-50/50 shadow-md scale-[1.02]"
                        : "border-slate-100 hover:border-slate-200 bg-white"
                    )}
                  >
                    <span className="font-bold text-sm text-slate-800">{outcome.label}</span>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      callOutcome === outcome.value ? "border-blue-600 bg-blue-600" : "border-slate-200"
                    )}>
                      {callOutcome === outcome.value && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-black text-slate-500 uppercase tracking-wider">GÖRÜŞME NOTU</Label>
              <textarea
                className="w-full h-32 p-4 rounded-xl border-2 border-slate-100 focus:border-blue-600 focus:ring-0 transition-all text-sm font-medium placeholder:text-slate-300 resize-none"
                placeholder="Neler konuşuldu? Önemli notlar..."
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="bg-slate-50 p-6 flex gap-3">
            <Button
              variant="ghost"
              className="flex-1 font-bold text-slate-500 hover:bg-slate-100 h-12 rounded-xl"
              onClick={() => setCallModal(null)}
            >
              Vazgeç
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-black h-12 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
              onClick={saveCallLog}
              disabled={saving}
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  KAYDEDİLİYOR...
                </div>
              ) : 'ARAMAYI TAMAMLA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
