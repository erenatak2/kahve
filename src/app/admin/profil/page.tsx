'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { KeyRound, User, Shuffle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AdminProfilPage() {
  const { data: session } = useSession()
  const [name, setName] = useState(session?.user?.name || '')
  const [email, setEmail] = useState(session?.user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)
    const res = await fetch('/api/admin/profil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    })

    if (res.ok) {
      toast({ title: 'Profil güncellendi', description: 'Bilgileriniz başarıyla kaydedildi.' })
      router.refresh() // Sessizce layout'u yenile
    } else {
      const err = await res.json().catch(() => ({}))
      toast({ title: 'Hata', description: err.error || 'Profil güncellenemedi', variant: 'destructive' })
    }
    setProfileLoading(false)
  }

  const generateRandomPassword = () => {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setNewPassword(password)
    setConfirmPassword(password)
    toast({ title: 'Rastgele şifre oluşturuldu', description: 'Şifreyi kopyalayıp saklayın' })
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword.length < 4) {
      return toast({ title: 'Yeni şifre en az 4 karakter olmalı', variant: 'destructive' })
    }
    
    if (newPassword !== confirmPassword) {
      return toast({ title: 'Yeni şifreler eşleşmiyor', variant: 'destructive' })
    }

    setLoading(true)
    const res = await fetch('/api/admin/sifre', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })

    if (res.ok) {
      toast({ title: 'Şifreniz başarıyla değiştirildi' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      const err = await res.json().catch(() => ({}))
      toast({ title: 'Hata', description: err.error || 'Şifre değiştirilemedi', variant: 'destructive' })
    }
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Profil Ayarları</h1>
        <p className="text-gray-500 text-sm">Hesap bilgilerinizi yönetin</p>
      </div>

      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Hesap Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label>Ad Soyad</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="pt-2">
                <Button type="submit" disabled={profileLoading}>
                  {profileLoading ? 'Kaydediliyor...' : 'Bilgileri Kaydet'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Şifre Değiştir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label>Mevcut Şifre</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Mevcut şifrenizi girin"
                />
              </div>
              <div className="space-y-2">
                <Label>Yeni Şifre</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    placeholder="Yeni şifrenizi girin (min. 4 karakter)"
                    minLength={4}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateRandomPassword}
                    title="Rastgele şifre oluştur"
                  >
                    <Shuffle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Yeni Şifre (Tekrar)</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Yeni şifrenizi tekrar girin"
                  minLength={4}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
