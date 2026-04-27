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

// ContactCard Component
const ContactCard = ({ 
  contact, 
  index, 
  viewMode,
  handleOpenEditDialog, 
  setDeleteConfirm
}: { 
  contact: any, 
  index: number, 
  viewMode: 'compact' | 'card',
  handleOpenEditDialog: (c: any) => void, 
  setDeleteConfirm: (c: any) => void
}) => {
  const isEven = index % 2 === 0;
  const [isExpanded, setIsExpanded] = useState(false);
  const isCard = viewMode === 'card';

  if (isCard) {
    const isPast = contact.reminderAt && new Date(contact.reminderAt) < new Date();
    
    return (
      <Card 
        className="group relative flex flex-col border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default rounded-2xl overflow-hidden h-full bg-white border-2"
      >
        <CardContent className="p-5 flex flex-col h-full">
          {/* Top Right Actions */}
          <div className="absolute top-4 right-4 flex gap-1 items-center opacity-40 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors" 
              onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(contact); }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors" 
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: contact.id, name: contact.name }); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Header Section */}
          <div className="flex items-center gap-4 mb-5 shrink-0 pr-16">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center font-bold text-xl bg-indigo-600 text-white shadow-md shrink-0">
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h3 className="font-black text-slate-900 text-lg tracking-tight leading-tight uppercase">
                {contact.name}
              </h3>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <UserPlus className="h-3 w-3" />
                {contact.title || 'UNVAN YOK'}
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3 mb-5 shrink-0">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
              <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="truncate">{contact.customer?.businessName || contact.companyName || 'BAĞLI FİRMA YOK'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
              <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>{contact.phone || 'Telefon Yok'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
              <Mail className="h-4 w-4 text-indigo-500 shrink-0" />
              <span className="truncate">{contact.email || 'E-posta Yok'}</span>
            </div>
          </div>

          {/* Notes Section - Warm Background */}
          <div className="flex-1 mb-5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <MessageSquare className="h-3 w-3 text-amber-500" />
              <span className="text-[11px] font-black text-amber-600 uppercase tracking-widest">NOTLAR</span>
            </div>
            <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-100 h-full min-h-[100px]">
              <p className="text-sm font-bold text-amber-900 italic leading-relaxed whitespace-pre-wrap">
                {contact.notes || 'Görüşme notu bulunmuyor...'}
              </p>
            </div>
          </div>

          {/* Footer Area - Centered Badge */}
          <div className="mt-auto pt-2 shrink-0">
            {contact.reminderAt ? (
              <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 font-black text-[11px] uppercase tracking-wider shadow-sm ${
                isPast 
                  ? 'bg-red-50 text-red-600 border-red-100 shadow-red-50' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-50'
              }`}>
                <Calendar className="h-4 w-4" />
                {format(new Date(contact.reminderAt), 'd MMMM yyyy  -  HH:mm', { locale: tr })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-2.5 rounded-xl border-2 border-dashed border-slate-100 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Hatırlatıcı Yok
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div 
      className={`rounded-xl border transition-all duration-300 relative group overflow-hidden ${
        isEven 
          ? 'bg-white border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-md' 
          : 'bg-slate-50/70 border-slate-200/40 shadow-sm hover:shadow-md'
      } py-2 px-3`}
    >
      {/* Üst Taraf: Tıklanabilir Alan */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 cursor-pointer hover:opacity-80 transition-opacity"
      >
        {/* Sol Taraf: Profil ve Ana Bilgiler */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            {contact.name.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex flex-col min-w-0">
            <h3 className="font-bold text-slate-900 text-base leading-none mb-1.5 group-hover:text-indigo-600 transition-colors truncate">
              {contact.name}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider border border-slate-200/50">
                {contact.title || 'UNVAN YOK'}
              </span>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <Building2 className="h-3 w-3 text-blue-500" />
                <span className="truncate max-w-[150px]">{contact.customer?.businessName || contact.companyName || 'FİRMA YOK'}</span>
              </div>
              {contact.phone && (
                <div className="flex items-center gap-2 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm ml-1">
                  <Phone className="h-3 w-3" />
                  <span className="text-xs font-black tracking-tight">{contact.phone}</span>
                </div>
              )}
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

          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
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

      {/* Genişleyen Notlar: Tıklanamaz ve Kopyalanabilir Alan */}
      {isExpanded && contact.notes && (
        <div className="mt-3 pt-3 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
          <div 
            className="bg-slate-50 rounded-xl p-3 border border-slate-200 relative cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap pr-4">
              {contact.notes}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function KontaklarClient({ initialContacts, customers, session }: KontaklarClientProps) {
  const [contacts, setContacts] = useState(initialContacts)
  const [search, setSearch] = useState('')

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string } | null>(null)
  const [editingContact, setEditingContact] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [viewMode, setViewMode] = useState<'compact' | 'card'>('compact')
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
    // Initial skeleton simulation (optional, just to show the effect if data loads fast)
    const t = setTimeout(() => setIsInitialLoad(false), 500)
    return () => clearTimeout(t)
  }, [])



  const filteredContacts = contacts.filter((c: any) => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.customer?.businessName?.toLowerCase().includes(search.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    c.customer?.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.title?.toLowerCase().includes(search.toLowerCase())
  ).sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr'))

  const handleOpenAddDialog = () => {
    setEditingContact(null)
    const now = new Date()
    const formattedNow = format(now, "yyyy-MM-dd'T'HH:mm")
    setFormData({
      name: '',
      title: '',
      phone: '',
      email: '',
      notes: '',
      customerId: '',
      companyName: '',
      reminderAt: formattedNow
    })
    setIsDialogOpen(true)
  }

  const handleOpenEditDialog = (contact: any) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name,
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
    const input = e.target;
    const start = input.selectionStart || 0;
    const oldLen = formData.phone.length;
    let v = input.value.replace(/\D/g, '');
    
    // Baştaki 0'ı engelle
    if (v.startsWith('0')) v = v.slice(1);
    
    v = v.slice(0, 10);
    
    if (v.length > 7) v = v.slice(0, 3) + '-' + v.slice(3, 6) + '-' + v.slice(6, 8) + '-' + v.slice(8);
    else if (v.length > 6) v = v.slice(0, 3) + '-' + v.slice(3, 6) + '-' + v.slice(6);
    else if (v.length > 3) v = v.slice(0, 3) + '-' + v.slice(3);
    
    setFormData({ ...formData, phone: v });

    // İmleç konumunu koru
    setTimeout(() => {
      const newLen = v.length;
      const diff = newLen - oldLen;
      const pos = start + (diff > 0 ? diff : 0);
      input.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const url = editingContact ? `/api/admin/kontaklar/${editingContact.id}` : '/api/admin/kontaklar'
    const method = editingContact ? 'PUT' : 'POST'

    const body = {
      ...formData,
      customerId: formData.customerId === 'MANUAL' ? null : formData.customerId
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        const result = await res.json()
        
        // State'i anında güncelle (UI'da bekletme yapma)
        if (editingContact) {
          setContacts(prev => prev.map((c: any) => c.id === result.id ? result : c))
          toast({ title: 'Güncellendi' })
        } else {
          setContacts(prev => [result, ...prev])
          toast({ title: 'Eklendi' })
        }
        
        // Pencereyi beklemeden kapat
        setIsDialogOpen(false)
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('Sunucu Hatası Detayı:', errorData)
        toast({ title: 'Hata', variant: 'destructive', description: errorData.error || 'İşlem başarısız.' })
      }
    } catch (error) {
      console.error('Bağlantı Hatası:', error)
      toast({ title: 'Bağlantı Hatası', variant: 'destructive' })
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
              Yeni Ekle
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
                      <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-3 flex-1">
                    <div className="h-8 bg-slate-100 rounded w-32"></div>
                    <div className="h-8 bg-slate-100 rounded w-40"></div>
                  </div>
                  <div className="h-8 bg-slate-100 rounded w-24 shrink-0"></div>
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden py-20 flex flex-col items-center justify-center text-slate-400">
              <Building2 className="h-12 w-12 opacity-20 mb-4" />
              <p className="text-lg font-bold">Kontak bulunamadı</p>
              <p className="text-sm font-medium">Arama kriterlerinizi değiştirin veya yeni bir kontak ekleyin.</p>
            </div>
          ) : (
            <div className={viewMode === 'card' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" 
              : "flex flex-col gap-2 md:gap-2.5"
            }>
              {filteredContacts.map((contact: any, index: number) => (
                <ContactCard 
                  key={contact.id} 
                  contact={contact} 
                  index={index}
                  viewMode={viewMode}
                  handleOpenEditDialog={handleOpenEditDialog} 
                  setDeleteConfirm={setDeleteConfirm}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] md:max-h-[90vh] border-none shadow-2xl rounded-3xl p-0 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shrink-0">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                {editingContact ? 'Kişi Bilgilerini Düzenle' : 'Yeni Kontak Ekle'}
              </DialogTitle>
              <DialogDescription className="text-blue-100 text-sm font-medium mt-1">
                {editingContact ? 'Mevcut kontak bilgilerini güncelleyin' : 'Lütfen tüm gerekli alanları doldurun'}
              </DialogDescription>
            </DialogHeader>
          </div>
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
              <div className="space-y-2 col-span-2">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">HATIRLATICI (TARİH VE SAAT)</Label>
                <div className="grid grid-cols-2 gap-3">
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
