'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Search, UserPlus, Phone, Mail, Building2, Calendar, MoreVertical, Edit, Trash2, Info, MessageSquare } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

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

  const filteredContacts = contacts.filter((c: any) => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.customer?.businessName?.toLowerCase().includes(search.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    c.customer?.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
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
    <div className="p-4 md:p-6 space-y-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            Kontaklar
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">İkinci ve üçüncü dereceden firma yetkililerini yönetin</p>
        </div>
        <Button onClick={handleOpenAddDialog} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95">
          <UserPlus className="h-4 w-4 mr-2" />
          Yeni Kontak Ekle
        </Button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <Input 
          placeholder="İsim, firma veya ünvan ile ara..." 
          className="pl-12 h-14 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-50/50 transition-all font-medium text-lg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.length === 0 ? (
          <Card className="col-span-full border-dashed border-2 py-20 bg-slate-50/50">
            <CardContent className="flex flex-col items-center justify-center text-slate-400">
              <Building2 className="h-12 w-12 opacity-20 mb-4" />
              <p className="text-lg font-bold">Kontak bulunamadı</p>
              <p className="text-sm font-medium">Arama kriterlerinizi değiştirin veya yeni bir kontak ekleyin.</p>
            </CardContent>
          </Card>
        ) : (
          filteredContacts.map((contact: any) => (
            <Card key={contact.id} className="border-slate-200 hover:shadow-xl transition-all group relative overflow-hidden bg-white/50 backdrop-blur-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md group-hover:scale-110 transition-transform">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase tracking-tight leading-none mb-1.5">{contact.name}</h3>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 w-fit">
                         <Info className="h-3 w-3 text-slate-500" />
                         <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{contact.title || 'UNVAN BELİRTİLMEDİ'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => handleOpenEditDialog(contact)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors" onClick={() => setDeleteConfirm({ id: contact.id, name: contact.name })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2.5 text-sm font-bold text-slate-700">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <span className="truncate">{contact.customer?.businessName || contact.companyName || 'BAĞLI FİRMA YOK'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm font-bold text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {contact.phone || 'Telefon yok'}
                  </div>
                  <div className="flex items-center gap-2.5 text-sm font-bold text-slate-600">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="truncate">{contact.email || 'E-posta yok'}</span>
                  </div>
                </div>

                {contact.notes && (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 mt-4 group-hover:bg-amber-50 transition-colors">
                    <div className="flex items-center gap-2 mb-1.5">
                       <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                       <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">NOTLAR</span>
                    </div>
                    <p className="text-xs font-semibold text-amber-900 leading-relaxed italic line-clamp-2">
                      "{contact.notes}"
                    </p>
                  </div>
                )}

                {contact.reminderAt && (
                   <div className={`mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-black text-[11px] uppercase tracking-widest transition-all ${
                     new Date(contact.reminderAt) < new Date() ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'
                   }`}>
                      <Calendar className="h-4 w-4" />
                      {format(new Date(contact.reminderAt), 'd MMMM yyyy - HH:mm', { locale: tr })}
                   </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
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
                <Label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">HATIRLATICI TARİHİ</Label>
                <Input type="datetime-local" value={formData.reminderAt} onChange={e => setFormData({ ...formData, reminderAt: e.target.value })} className="h-11 rounded-xl border-slate-200 font-bold" />
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
