'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Users, UserPlus, Eye, EyeOff, Trash2, ShieldCheck, User } from 'lucide-react'

export default function EkipYonetimiPage() {
  const [team, setTeam] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('SATICI')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/admin/ekip')
      const data = await res.json()
      if (res.ok) {
        setTeam(data)
      } else {
        setError(data.error || 'Ekip bilgileri alınamadı.')
      }
    } catch (err) {
      setError('Bir bağlantı hatası oluştu.')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTeam()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/ekip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      })
      const data = await res.json()
      
      if (res.ok) {
        toast({ title: 'Başarılı', description: 'Yeni ekip üyesi sisteme eklendi.' })
        setName('')
        setEmail('')
        setPassword('')
        setRole('SATICI')
        fetchTeam() // Refresh list
      } else {
        toast({ title: 'Hata', description: data.error || 'Eklenemedi.', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bir bağlantı hatası oluştu.', variant: 'destructive' })
    }
    setIsSubmitting(false)
  }

  const handleDelete = async (id: string, userName: string) => {
    if (!confirm(`Dikkat! ${userName} adlı kullanıcıyı sistemden silmek istediğinize emin misiniz?`)) return

    try {
      const res = await fetch(`/api/admin/ekip?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      
      if (res.ok) {
        toast({ title: 'Silindi', description: 'Kullanıcı sistemden başarıyla kaldırıldı.' })
        fetchTeam()
      } else {
        toast({ title: 'Hata', description: data.error || 'Silinemedi.', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Bağlantı hatası.', variant: 'destructive' })
    }
  }

  if (error) return <div className="p-6 text-red-500 font-medium">Hata: {error}</div>

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
                <UserPlus className="h-5 w-5 text-gray-700" />
                Yeni Üye Ekle
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
                  <Label>Sisteme Giriş Şifresi</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? 'text' : 'password'} 
                      required 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="Şifre belirleyin" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
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
                    <option value="SATICI">Satış Temsilcisi (Plasiyer - Sadece kendi müşterilerini görür)</option>
                    <option value="ADMIN">Ana Yönetici (Tüm raporları ve finansalları görür)</option>
                  </select>
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700">
                  {isSubmitting ? 'Hesap Oluşturuluyor...' : 'Hesabı Oluştur'}
                </Button>
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
              {loading ? (
                <div className="p-8 text-center text-gray-500">Kullanıcılar yükleniyor...</div>
              ) : team.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Kayıtlı sistem yetkilisi bulunamadı.</div>
              ) : (
                <div className="divide-y">
                  {team.map((member) => (
                    <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${member.role === 'ADMIN' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                          {member.role === 'ADMIN' ? <ShieldCheck className="h-5 w-5 text-purple-700" /> : <User className="h-5 w-5 text-blue-700" />}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                          member.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {member.role === 'ADMIN' ? 'YÖNETİCİ' : 'SATICI'}
                        </span>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                          title="Hesabı Sil"
                          onClick={() => handleDelete(member.id, member.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
