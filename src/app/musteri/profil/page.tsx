'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { KeyRound, User, Shuffle, MapPin } from 'lucide-react'

export default function ProfilPage() {
  const { data: session } = useSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [adresLoading, setAdresLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [sameAddress, setSameAddress] = useState(true)
  const [city, setCity] = useState('')
  const [taxNumber, setTaxNumber] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    fetch('/api/musteri/profil').then(r => r.json()).then(d => {
      if (d.phone) setPhone(d.phone)
      if (d.address) setAddress(d.address)
      if (d.shippingAddress) setShippingAddress(d.shippingAddress)
      if (d.city) setCity(d.city)
      if (d.taxNumber) setTaxNumber(d.taxNumber)
      if (d.shippingAddress && d.shippingAddress !== d.address) setSameAddress(false)
    }).catch(() => {})
  }, [])

  const handleAdresKaydet = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdresLoading(true)
    const res = await fetch('/api/musteri/profil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, address, shippingAddress: sameAddress ? address : shippingAddress, city, taxNumber }),
    })
    if (res.ok) {
      toast({ title: 'Adres bilgileri kaydedildi' })
    } else {
      toast({ title: 'Hata', description: 'Kaydedilemedi', variant: 'destructive' })
    }
    setAdresLoading(false)
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
    const res = await fetch('/api/musteri/sifre', {
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
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Profilim</h1>
        <p className="text-gray-500 text-sm">Hesap bilgilerinizi yönetin</p>
      </div>

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
          <div className="pt-2 border-t">
            <Label className="text-xs text-gray-500 mb-1.5 block">TC Kimlik No / Vergi No</Label>
            <Input
              placeholder="10 veya 11 haneli numara"
              value={taxNumber}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 11)
                setTaxNumber(v)
              }}
              className="h-9 text-sm"
            />
            <p className="text-[11px] text-gray-400 mt-1">Fatura kesmek için gereklidir. Vergi No: 10 hane, TC Kimlik: 11 hane</p>
            <Button 
              size="sm" 
              className="mt-2 w-full" 
              onClick={async () => {
                const res = await fetch('/api/musteri/profil', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ phone, address, shippingAddress: sameAddress ? address : shippingAddress, city, taxNumber }),
                })
                if (res.ok) toast({ title: 'TC Kimlik/Vergi No kaydedildi' })
                else toast({ title: 'Hata', description: 'Kaydedilemedi', variant: 'destructive' })
              }}
            >
              Kaydet
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Adres Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdresKaydet} className="space-y-3">
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input placeholder="05xx xxx xx xx" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fatura Adresi</Label>
              <Input placeholder="Mahalle, cadde, sokak, kapı no..." value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="sameAddress"
                checked={sameAddress}
                onChange={(e) => {
                  setSameAddress(e.target.checked)
                  if (e.target.checked) {
                    setShippingAddress(address)
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="sameAddress" className="text-sm text-gray-700">Teslimat adresi fatura adresiyle aynı</label>
            </div>
            {!sameAddress && (
              <div className="space-y-2">
                <Label>Teslimat Adresi</Label>
                <Input placeholder="Farklı teslimat adresi varsa girin" value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Şehir</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={city}
                onChange={e => setCity(e.target.value)}
              >
                <option value="">Şehir seçin...</option>
                <option value="Adana">Adana</option>
                <option value="Adıyaman">Adıyaman</option>
                <option value="Afyonkarahisar">Afyonkarahisar</option>
                <option value="Ağrı">Ağrı</option>
                <option value="Amasya">Amasya</option>
                <option value="Ankara">Ankara</option>
                <option value="Antalya">Antalya</option>
                <option value="Artvin">Artvin</option>
                <option value="Aydın">Aydın</option>
                <option value="Balıkesir">Balıkesir</option>
                <option value="Bilecik">Bilecik</option>
                <option value="Bingöl">Bingöl</option>
                <option value="Bitlis">Bitlis</option>
                <option value="Bolu">Bolu</option>
                <option value="Burdur">Burdur</option>
                <option value="Bursa">Bursa</option>
                <option value="Çanakkale">Çanakkale</option>
                <option value="Çankırı">Çankırı</option>
                <option value="Çorum">Çorum</option>
                <option value="Denizli">Denizli</option>
                <option value="Diyarbakır">Diyarbakır</option>
                <option value="Edirne">Edirne</option>
                <option value="Elazığ">Elazığ</option>
                <option value="Erzincan">Erzincan</option>
                <option value="Erzurum">Erzurum</option>
                <option value="Eskişehir">Eskişehir</option>
                <option value="Gaziantep">Gaziantep</option>
                <option value="Giresun">Giresun</option>
                <option value="Gümüşhane">Gümüşhane</option>
                <option value="Hakkari">Hakkari</option>
                <option value="Hatay">Hatay</option>
                <option value="Isparta">Isparta</option>
                <option value="Mersin">Mersin</option>
                <option value="İstanbul">İstanbul</option>
                <option value="İzmir">İzmir</option>
                <option value="Kars">Kars</option>
                <option value="Kastamonu">Kastamonu</option>
                <option value="Kayseri">Kayseri</option>
                <option value="Kırklareli">Kırklareli</option>
                <option value="Kırşehir">Kırşehir</option>
                <option value="Kocaeli">Kocaeli</option>
                <option value="Konya">Konya</option>
                <option value="Kütahya">Kütahya</option>
                <option value="Malatya">Malatya</option>
                <option value="Manisa">Manisa</option>
                <option value="Kahramanmaraş">Kahramanmaraş</option>
                <option value="Mardin">Mardin</option>
                <option value="Muğla">Muğla</option>
                <option value="Muş">Muş</option>
                <option value="Nevşehir">Nevşehir</option>
                <option value="Niğde">Niğde</option>
                <option value="Ordu">Ordu</option>
                <option value="Rize">Rize</option>
                <option value="Sakarya">Sakarya</option>
                <option value="Samsun">Samsun</option>
                <option value="Siirt">Siirt</option>
                <option value="Sinop">Sinop</option>
                <option value="Sivas">Sivas</option>
                <option value="Tekirdağ">Tekirdağ</option>
                <option value="Tokat">Tokat</option>
                <option value="Trabzon">Trabzon</option>
                <option value="Tunceli">Tunceli</option>
                <option value="Şanlıurfa">Şanlıurfa</option>
                <option value="Uşak">Uşak</option>
                <option value="Van">Van</option>
                <option value="Yozgat">Yozgat</option>
                <option value="Zonguldak">Zonguldak</option>
                <option value="Aksaray">Aksaray</option>
                <option value="Bayburt">Bayburt</option>
                <option value="Karaman">Karaman</option>
                <option value="Kırıkkale">Kırıkkale</option>
                <option value="Batman">Batman</option>
                <option value="Şırnak">Şırnak</option>
                <option value="Bartın">Bartın</option>
                <option value="Ardahan">Ardahan</option>
                <option value="Iğdır">Iğdır</option>
                <option value="Yalova">Yalova</option>
                <option value="Karabük">Karabük</option>
                <option value="Kilis">Kilis</option>
                <option value="Osmaniye">Osmaniye</option>
                <option value="Düzce">Düzce</option>
              </select>
            </div>
            <Button type="submit" disabled={adresLoading} className="w-full">
              {adresLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
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
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
