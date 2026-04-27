'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Search, UserPlus, Phone, Mail, Building2, Calendar, Edit, Trash2, Info, MessageSquare, ChevronDown, ChevronUp, LayoutGrid, List, X, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface ContactCardProps {
  contact: any
  handleOpenEditDialog: (c: any) => void
  setDeleteConfirm: (data: { id: string, name: string }) => void
}

function ContactCard({ contact, handleOpenEditDialog, setDeleteConfirm }: ContactCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-blue-200/60 transition-all duration-300 p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Sol Taraf: Profil ve Bilgi */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-black shadow-lg shadow-blue-100 shrink-0 group-hover:scale-105 transition-transform duration-300">
            {contact.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-base font-black text-slate-900 truncate tracking-tight uppercase">{contact.name}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 w-fit">
                <Info className="h-3 w-3 text-slate-500" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                  {contact.title || 'UNVAN BELİRTİLMEDİ'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <Building2 className="h-3 w-3 text-blue-500" />
                <span className="truncate max-w-[150px] uppercase">{contact.customer?.businessName || contact.companyName || 'FİRMA YOK'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Orta Taraf: İletişim ve Hatırlatıcı */}
        <div className="flex flex-wrap items-center gap-2 lg:gap-4 shrink-0">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-200 shadow-sm">
            {contact.reminderAt ? (
              <>
                <Calendar className="h-3.5 w-3.5 text-amber-700" />
                <span className="text-[11px] font-black text-amber-800 uppercase tracking-tight">
                  {format(new Date(contact.reminderAt), 'd MMM  -  HH:mm', { locale: tr })}
                </span>
              </>
            ) : (
              <div className="h-5" />
            )}
          </div>

          <div className="flex gap-1.5">
            {contact.notes && (
              <Button
                variant="outline"
                size="icon"
                className={`h-8 w-8 rounded-lg border-slate-200 transition-all ${isExpanded ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-indigo-50 hover:text-indigo-600'}`}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-slate-200 bg-white hover:bg-blue-50 hover:text-blue-600 transition-colors"
              onClick={() => handleOpenEditDialog(contact)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 transition-colors"
              onClick={() => setDeleteConfirm({ id: contact.id, name: contact.name })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Genişleyen Notlar */}
      {isExpanded && contact.notes && (
        <div className="mt-3 pt-3 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-100 relative cursor-default">
            <div className="flex items-center gap-1.5 mb-1">
              <MessageSquare className="h-3 w-3 text-amber-500" />
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">NOTLAR</span>
            </div>
            <p className="text-sm font-bold text-amber-900 italic leading-relaxed whitespace-pre-wrap pr-4">
              {contact.notes}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

interface KontaklarClientProps {
  initialContacts: any[]
  customers: any[]
  session: any
}

export default function KontaklarClient({ initialContacts, customers, session }: KontaklarClientProps) {
  const [contacts, setContacts] = useState(initialContacts)
  const [search, setSearch] = useState('')

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string } | null>(null)
  const [editingContact, setEditingContact] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card')
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    title: '',
    phone: '',
    email: '',
    notes: '',
    customerId: '',
    companyName: '',
    reminderAt: ''
  })

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const filtered = contacts.filter((c: any) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.customer?.businessName?.toLowerCase().includes(search.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    c.title?.toLowerCase().includes(search.toLowerCase())
  )

  const handleOpenAddDialog = () => {
    setEditingContact(null)
    setFormData({
      name: '',
      title: '',
      phone: '',
      email: '',
      notes: '',
      customerId: '',
      companyName: '',
      reminderAt: ''
    })
    setIsDialogOpen(true)
  }

  const handleOpenEditDialog = (contact: any) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name || '',
      title: contact.title || '',
      phone: contact.phone || '',
      email: contact.email || '',
      notes: contact.notes || '',
      customerId: contact.customerId || (contact.companyName ? 'MANUAL' : ''),
      companyName: contact.companyName || '',
      reminderAt: contact.reminderAt ? format(new Date(contact.reminderAt), "yyyy-MM-dd'T'HH:mm") : ''
    })
    setIsDialogOpen(true)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 10) value = value.slice(0, 10)
    
    let formatted = ''
    if (value.length > 0) formatted = value.slice(0, 3)
    if (value.length > 3) formatted += '-' + value.slice(3, 6)
    if (value.length > 6) formatted += '-' + value.slice(6, 8)
    if (value.length > 8) formatted += '-' + value.slice(8, 10)
    
    setFormData({ ...formData, phone: formatted })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingContact ? `/api/admin/kontaklar/${editingContact.id}` : '/api/admin/kontaklar'
      const method = editingContact ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customerId: formData.customerId === 'MANUAL' ? null : formData.customerId,
          reminderAt: formData.reminderAt ? new Date(formData.reminderAt).toISOString() : null
        })
      })

      if (res.ok) {
        const savedContact = await res.json()
        if (editingContact) {
          setContacts(contacts.map((c: any) => c.id === editingContact.id ? savedContact : c))
          toast({ title: 'Güncellendi', description: 'Kontak bilgileri başarıyla güncellendi.' })
        } else {
          setContacts([savedContact, ...contacts])
          toast({ title: 'Kaydedildi', description: 'Yeni kontak başarıyla eklendi.' })
        }
        setIsDialogOpen(false)
      }
    } catch (error) {
      toast({ title: 'Hata', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    try {
      const res = await fetch(`/api/admin/kontaklar/${deleteConfirm.id}`, { method: 'DELETE' })
      if (res.ok) {
        setContacts(contacts.filter((c: any) => c.id !== deleteConfirm.id))
        toast({ title: 'Silindi', description: 'Kontak başarıyla kaldırıldı.' })
        setDeleteConfirm(null)
      }
    } catch (error) {
      toast({ title: 'Hata', variant: 'destructive' })
    }
  }

  return (
    <div className="bg-slate-50/50 min-h-screen pb-12">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-xl border-b border-slate-200/50 px-4 md:px-6 py-4 md:py-6 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Kontaklar
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200/50 p-1 rounded-lg border border-slate-200 mr-1">
              <Button
                variant={viewMode === 'compact' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('compact')}
                className={`h-7 rounded-md px-2 text-xs ${viewMode === 'compact' ? 'bg-white text-blue-600 shadow-sm hover:bg-white' : 'text-slate-500 hover:bg-slate-300/30'}`}
              >
                <List className="h-3.5 w-3.5 mr-1" />
                Kompakt
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className={`h-7 rounded-md px-2 text-xs ${viewMode === 'card' ? 'bg-white text-blue-600 shadow-sm hover:bg-white' : 'text-slate-500 hover:bg-slate-300/30'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                Kartvizit
              </Button>
            </div>
            <Button onClick={handleOpenAddDialog} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-4 rounded-lg shadow-blue-100 transition-all active:scale-95">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Yeni Kontak Ekle
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <Input
            placeholder="İsim, firma veya ünvan ile ara..."
            className="pl-9 h-10 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-50 transition-all font-medium text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div>
          {isInitialLoad ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 animate-pulse bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-2xl bg-slate-200 shrink-0"></div>
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="h-5 bg-slate-200 rounded w-1/3"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                    </div>
                  </div>
                  <div className="h-8 bg-slate-200 rounded w-24"></div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
              <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-900">Sonuç Bulunamadı</h3>
              <p className="text-slate-500 text-sm font-medium mt-1">Arama kriterlerinize uygun kontak bulunmuyor.</p>
            </div>
          ) : viewMode === 'compact' ? (
            <div className="flex flex-col gap-3">
              {filtered.map((contact: any) => (
                <ContactCard key={contact.id} contact={contact} handleOpenEditDialog={handleOpenEditDialog} setDeleteConfirm={setDeleteConfirm} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((contact: any) => {
                const reminderDate = contact.reminderAt ? new Date(contact.reminderAt) : null;
                const isPastOrToday = reminderDate ? reminderDate.getTime() <= new Date().setHours(23, 59, 59, 999) : false;

                return (
                  <div key={contact.id} className="rounded-lg border text-card-foreground shadow-sm border-slate-200 hover:shadow-xl transition-all group relative overflow-hidden bg-white/50 backdrop-blur-sm">
                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md group-hover:scale-110 transition-transform">
                            {contact.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-800 uppercase tracking-tight leading-none mb-1.5">{contact.name}</h3>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 w-fit">
                              <Info className="h-3 w-3 text-slate-500" />
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                {contact.title || 'UNVAN BELİRTİLMEDİ'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(contact)} className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm({ id: contact.id, name: contact.name })} className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-2">
                        <div className="flex items-center gap-2.5 text-sm font-bold text-slate-700">
                          <Building2 className="h-4 w-4 text-blue-500" />
                          <span className="truncate uppercase">
                            {contact.customer?.businessName || contact.companyName ? `BAĞLI FİRMA: ${contact.customer?.businessName || contact.companyName}` : 'BAĞLI FİRMA YOK'}
                          </span>
                        </div>
                        <div className={cn("flex items-center gap-2.5 text-sm font-bold", contact.phone ? "text-slate-700" : "text-slate-600")}>
                          <Phone className={cn("h-4 w-4", contact.phone ? "text-slate-500" : "text-slate-400")} />
                          {contact.phone || 'Telefon yok'}
                        </div>
                        <div className={cn("flex items-center gap-2.5 text-sm font-bold", contact.email ? "text-slate-700" : "text-slate-600")}>
                          <Mail className={cn("h-4 w-4", contact.email ? "text-slate-500" : "text-slate-400")} />
                          <span className="truncate">{contact.email || 'E-posta yok'}</span>
                        </div>
                      </div>

                      {contact.notes && (
                        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 mt-4 group-hover:bg-amber-50 transition-colors">
                          <div className="flex items-center gap-2 mb-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">NOTLAR</span>
                          </div>
                          <p className="text-xs font-semibold text-amber-900 leading-relaxed italic">
                            "{contact.notes}"
                          </p>
                        </div>
                      )}

                      {reminderDate && (
                        <div className={cn(
                          "mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-black text-[11px] uppercase tracking-widest transition-all",
                          isPastOrToday 
                            ? "bg-red-50 text-red-700 border-red-100" 
                            : "bg-green-50 text-green-700 border-green-100"
                        )}>
                          <Calendar className="h-4 w-4" />
                          {format(reminderDate, 'd MMMM yyyy - HH:mm', { locale: tr })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ekle/Düzenle Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-[2rem] flex flex-col h-[90vh]">
          <DialogHeader className="p-8 bg-slate-900 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                  {editingContact ? <Edit className="h-6 w-6 text-blue-400" /> : <UserPlus className="h-6 w-6 text-blue-400" />}
                  {editingContact ? 'Kontak Düzenle' : 'Yeni Kontak Ekle'}
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-medium mt-1">
                  {editingContact ? 'Mevcut kontak bilgilerini güncelleyin.' : 'İletişim ağınıza yeni bir kişi ekleyin.'}
                </DialogDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(false)} className="rounded-full hover:bg-white/10 text-white/50 hover:text-white">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 bg-white custom-scrollbar">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">AD SOYAD *</Label>
                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-11 rounded-xl border-slate-200 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">ÜNVAN / POZİSYON</Label>
                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Örn: Şube Müdürü" className="h-11 rounded-xl border-slate-200 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">BAĞLI FİRMA</Label>
                <select
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={formData.customerId}
                  onChange={e => setFormData({ ...formData, customerId: e.target.value, companyName: e.target.value !== 'MANUAL' ? '' : formData.companyName })}
                >
                  <option value="">Firma Seçin (Mevcut Müşteri)...</option>
                  <option value="MANUAL" className="text-blue-600 font-black">➕ DİĞER / MANUEL GİRİŞ</option>
                  {Array.isArray(customers) && customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.businessName || c.user?.name}</option>
                  ))}
                </select>
              </div>

              {formData.customerId === 'MANUAL' && (
                <div className="space-y-2 col-span-2 bg-blue-50 p-4 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-xs font-black text-blue-600 uppercase tracking-wider ml-1">MANUEL FİRMA ADI *</Label>
                  <Input
                    required
                    placeholder="Müşterimiz olmayan firmanın adını yazın..."
                    value={formData.companyName}
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    className="h-11 rounded-xl border-blue-200 font-bold bg-white"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">TELEFON</Label>
                <div className="flex gap-2">
                  <div className="h-11 px-3 flex items-center justify-center bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-600">+90</div>
                  <Input
                    placeholder="5XX-XXX-XX-XX"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className="flex-1 h-11 rounded-xl border-slate-200 font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">E-POSTA</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="h-11 rounded-xl border-slate-200 font-bold" />
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">HATIRLATICI TARİHİ</Label>
                  <Input
                    type="date"
                    value={formData.reminderAt ? formData.reminderAt.split('T')[0] : ''}
                    onChange={e => {
                      const newDate = e.target.value;
                      const currentTime = formData.reminderAt?.split('T')[1] || '09:00';
                      setFormData({ ...formData, reminderAt: `${newDate}T${currentTime}` });
                    }}
                    className="h-11 rounded-xl border-slate-200 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">ARANACAK SAAT</Label>
                  <Input
                    type="time"
                    value={formData.reminderAt ? formData.reminderAt.split('T')[1] : ''}
                    onChange={e => {
                      const newTime = e.target.value;
                      const currentDate = formData.reminderAt?.split('T')[0] || format(new Date(), 'yyyy-MM-dd');
                      setFormData({ ...formData, reminderAt: `${currentDate}T${newTime}` });
                    }}
                    className="h-11 rounded-xl border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">ÖZEL NOTLAR</Label>
                <textarea
                  className="w-full min-h-[100px] rounded-xl border border-slate-200 p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Onu nereden tanıyorum, niye arayacağım?..."
                />
              </div>
            </div>
          </form>
          <div className="p-6 bg-white border-t shrink-0">
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-12 font-bold px-8">Vazgeç</Button>
              <Button onClick={(e: any) => handleSubmit(e)} disabled={loading} className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-black px-10 rounded-2xl shadow-lg shadow-blue-100 uppercase tracking-widest transition-all active:scale-95 flex-1">
                {editingContact ? 'GÜNCELLE' : 'KAYDET'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Silme Onay Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-red-50 p-6 flex flex-col items-center text-center">
            <div className="h-16 w-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">Kişiyi Sil</DialogTitle>
              <DialogDescription className="text-slate-500 text-sm font-medium mt-2">
                <span className="font-black text-red-600">{deleteConfirm?.name}</span> adlı kişiyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="p-4 bg-white flex gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="flex-1 font-bold h-12 rounded-2xl">Vazgeç</Button>
            <Button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black h-12 rounded-2xl shadow-lg shadow-red-100 uppercase tracking-widest transition-all active:scale-95">
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
