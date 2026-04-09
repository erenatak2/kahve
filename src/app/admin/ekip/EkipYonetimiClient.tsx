'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Users, UserPlus, Eye, EyeOff, Trash2, ShieldCheck, User, Edit, UserCog, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface EkipYonetimiClientProps {
  initialTeam: any[]
}

export default function EkipYonetimiClient({ initialTeam }: EkipYonetimiClientProps) {
  const [team, setTeam] = useState<any[]>(initialTeam)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('SATICI')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Sadece client tarafında yeni veri ekleme/silme sonrası listeyi tazelemek için
  const refreshTeam = async () => {
    try {
      const res = await fetch('/api/admin/ekip')
      const data = await res.json()
      if (res.ok) setTeam(data)
    } catch (err) {
      console.error('Liste güncellenemedi')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const url = '/api/admin/ekip'
      const payload = editingId ? { id: editingId, name, email, password, role } : { name, email, password, role }
      
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      
      if (res.ok) {
        toast({ title: 'Başarılı', description: editingId ? 'Ekip üyesi güncellendi.' : 'Yeni ekip üyesi sisteme eklendi.' })
        setEditingId(null)
        setName('')
        setEmail('')
        setPassword('')
        setRole('SATICI')
        refreshTeam()
        router.refresh()
      } else {
        toast({ title: 'Hata', description: data.error || 'İşlem başarısız.', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir bağlantı hatası oluştu.', variant: 'destructive' })
    }
    setIsSubmitting(false)
  }

  const handleEditClick = (member: any) => {
    setEditingId(member.id)
    setName(member.name)
    setEmail(member.email)
    setRole(member.role)
    setPassword('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string, userName: string) => {
    if (!confirm(`Dikkat! ${userName} adlı kullanıcıyı sistemden silmek istediğinize emin misiniz?`)) return
    try {
      const res = await fetch(`/api/admin/ekip?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Silindi', description: 'Kullanıcı sistemden başarıyla kaldırıldı.' })
        refreshTeam()
        router.refresh()
      } else {
        const data = await res.json()
        toast({ title: 'Hata', description: data.error || 'Silinemedi.', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bağlantı hatası.', variant: 'destructive' })
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" />
          Ekip ve Rol Yönetimi
        </h1>
        <p className="text-gray-500 text-sm mt-1">Sisteme yeni Satış Temsilcisi veya Yönetici ekleyin, mevcut hesapları yönetin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Yeni Kullanıcı Formu */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="bg-gray-50 border-b pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                {editingId ? <UserCog className="h-5 w-5 text-gray-700" /> : <UserPlus className="h-5 w-5 text-gray-700" />}
                {editingId ? 'Üye Bilgilerini Düzenle' : 'Yeni Üye Ekle'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Ad Soyad</Label>
                  <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Örn: Ahmet Yılmaz" />
                </div>
                <div className="space-y-2">
                  <Label>E-posta (Giriş Adresi)</Label>
                  <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="ahmet@satis.com" />
                </div>
                <div className="space-y-2">
                  <Label>{editingId ? 'Sisteme Giriş Şifresi (Değiştirmek istemiyorsanız boş bırakın)' : 'Sisteme Giriş Şifresi'}</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? 'text' : 'password'} 
                      required={!editingId} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder={editingId ? 'Yeni şifre belirleyin' : 'Şifre belirleyin'} 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Sistem Rolü (Yetki)</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                  >
                    <option value="SATICI">Satış Temsilcisi (Plasiyer)</option>
                    <option value="ADMIN">Ana Yönetici</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  {editingId && (
                    <Button type="button" onClick={() => { setEditingId(null); setName(''); setEmail(''); setPassword(''); setRole('SATICI'); }} variant="outline" className="flex-1">
                      İptal
                    </Button>
                  )}
                  <Button type="submit" disabled={isSubmitting} className={`flex-[2] ${editingId ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
                    {isSubmitting ? 'İşleniyor...' : (editingId ? 'Kaydet' : 'Hesabı Oluştur')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Ekip Listesi */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="bg-gray-50 border-b pb-4">
              <CardTitle className="text-base">Mevcut Ekip Üyeleri</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {team.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Kayıtlı sistem yetkilisi bulunamadı.</div>
              ) : (
                <div className="divide-y">
                  {team.map((member) => (
                    <div key={member.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${member.role === 'ADMIN' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                            {member.role === 'ADMIN' ? <ShieldCheck className="h-5 w-5 text-purple-700" /> : <User className="h-5 w-5 text-blue-700" />}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{member.name}</p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                            member.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {member.role === 'ADMIN' ? 'YÖNETİCİ' : 'SATICI'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-6 bg-white p-2 px-4 rounded-xl border border-gray-100 shadow-sm">
                          <div className="text-center">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Ciro</p>
                            <p className="text-sm font-bold text-green-600">{formatCurrency(member.stats?.totalSales || 0)}</p>
                          </div>
                          <div className="text-center border-x px-6 border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Sipariş</p>
                            <p className="text-sm font-bold text-gray-700">{member.stats?.orderCount || 0}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Müşteri</p>
                            <p className="text-sm font-bold text-blue-600">{member.stats?.customerCount || 0}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="outline" size="sm" className="gap-2 h-9 border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => router.push(`/admin/ekip/${member.id}`)}>
                            <Eye className="h-4 w-4" /> Aktivite İzle
                          </Button>
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 h-9 w-9" onClick={() => handleEditClick(member)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-9 w-9" onClick={() => handleDelete(member.id, member.name)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
