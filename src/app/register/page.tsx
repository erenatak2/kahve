'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ShoppingBag, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '', shippingAddress: '', city: '', taxNumber: '' })
  const [sameAddress, setSameAddress] = useState(true)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 4) return toast({ title: 'Şifre en az 4 karakter olmalı', variant: 'destructive' })
    if (form.taxNumber && !/^\d{10,11}$/.test(form.taxNumber)) {
      return toast({ title: 'TC/Vergi No 10 veya 11 rakam olmalı', variant: 'destructive' })
    }

    setLoading(true)
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        shippingAddress: sameAddress ? form.address : form.shippingAddress
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      toast({ title: 'Kayıt başarısız', description: data.error, variant: 'destructive' })
      setLoading(false)
      return
    }

    const result = await signIn('credentials', { email: form.email, password: form.password, redirect: false })
    if (result?.ok) {
      router.push('/musteri')
    } else {
      toast({ title: 'Kayıt başarılı! Giriş yapın.', description: 'Hesabınız oluşturuldu.' })
      router.push('/login/musteri')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-emerald-600 text-white p-3 rounded-2xl mb-4">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Satış Yönetim</h1>
          <p className="text-gray-500 text-sm mt-1">Yeni Müşteri Kaydı</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Kayıt Ol</CardTitle>
            <CardDescription>Hesap oluşturmak için bilgilerinizi girin</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Ad Soyad *</Label>
                <Input placeholder="Adınız Soyadınız" value={form.name} onChange={set('name')} required disabled={loading} />
              </div>
              <div className="space-y-1.5">
                <Label>E-posta *</Label>
                <Input type="email" placeholder="ornek@email.com" value={form.email} onChange={set('email')} required disabled={loading} />
              </div>
              <div className="space-y-1.5">
                <Label>Şifre *</Label>
                <Input type="password" placeholder="En az 4 karakter" value={form.password} onChange={set('password')} required minLength={4} disabled={loading} />
              </div>
              <div className="border-t pt-3 space-y-1.5">
                <Label>TC Kimlik No / Vergi No</Label>
                <Input
                  placeholder="10 veya 11 haneli numara"
                  value={form.taxNumber}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 11)
                    setForm(prev => ({ ...prev, taxNumber: v }))
                  }}
                  disabled={loading}
                />
                <p className="text-xs text-gray-400">Fatura kesmek için gereklidir. Vergi No: 10 hane, TC Kimlik: 11 hane</p>
              </div>
              <div className="space-y-1.5">
                <Label>Telefon *</Label>
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-20">
                    <div className="h-10 px-3 flex items-center justify-center bg-gray-100 border rounded-md text-sm font-medium text-gray-700">
                      +90
                    </div>
                  </div>
                  <Input
                    placeholder="XXX-XXX-XX-XX"
                    value={form.phone}
                    onChange={e => {
                      let v = e.target.value.replace(/\D/g, '').slice(0, 10)
                      // Başta 0 engelle
                      if (v.startsWith('0')) {
                        v = v.slice(1)
                      }
                      // Format: XXX-XXX-XX-XX
                      if (v.length > 7) {
                        v = v.slice(0, 3) + '-' + v.slice(3, 6) + '-' + v.slice(6, 8) + '-' + v.slice(8)
                      } else if (v.length > 6) {
                        v = v.slice(0, 3) + '-' + v.slice(3, 6) + '-' + v.slice(6)
                      } else if (v.length > 3) {
                        v = v.slice(0, 3) + '-' + v.slice(3)
                      }
                      setForm(prev => ({ ...prev, phone: v }))
                    }}
                    disabled={loading}
                    required
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-400">Başta 0 yazmayın, otomatik olarak +90 eklenir</p>
              </div>
              <div className="space-y-1.5">
                <Label>Fatura Adresi</Label>
                <Input placeholder="Mahalle, cadde, kapı no..." value={form.address} onChange={set('address')} disabled={loading} />
              </div>
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="sameAddress"
                  checked={sameAddress}
                  onChange={(e) => {
                    setSameAddress(e.target.checked)
                    if (e.target.checked) {
                      setForm(prev => ({ ...prev, shippingAddress: prev.address }))
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                  disabled={loading}
                />
                <label htmlFor="sameAddress" className="text-sm text-gray-700">Teslimat adresi fatura adresiyle aynı</label>
              </div>
              {!sameAddress && (
                <div className="space-y-1.5">
                  <Label>Teslimat Adresi</Label>
                  <Input placeholder="Farklı teslimat adresi varsa girin" value={form.shippingAddress} onChange={set('shippingAddress')} disabled={loading} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Şehir</Label>
                <Input placeholder="İstanbul" value={form.city} onChange={set('city')} disabled={loading} />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Kaydediliyor...</> : 'Kayıt Ol'}
              </Button>
              <p className="text-center text-sm text-gray-500">
                Zaten hesabınız var mı?{' '}
                <Link href="/login/musteri" className="text-emerald-600 font-medium hover:underline">Giriş Yap</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
