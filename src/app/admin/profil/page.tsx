'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { KeyRound, User, Shuffle } from 'lucide-react'

export default function AdminProfilPage() {
  const { data: session } = useSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

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
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-gray-500">Ad Soyad</Label>
              <p className="font-medium">{session?.user?.name}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">E-posta</Label>
              <p className="font-medium">{session?.user?.email}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Rol</Label>
              <p className="font-medium">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Yönetici
                </span>
              </p>
            </div>
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
