'use client'

import { useEffect, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ShoppingBag, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const { data: session, status } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Eğer müşteri girişi yapılmışsa, direkt dashboard'a at
    if (status === 'authenticated' && (session?.user as any)?.role === 'MUSTERI') {
      router.push('/musteri')
    }
  }, [session, status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      toast({ title: 'Hata', description: 'E-posta veya şifre hatalı.', variant: 'destructive' })
      setLoading(false)
    } else {
      router.push('/musteri')
      router.refresh()
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-600 text-white p-3 rounded-2xl mb-4">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Satış Yönetim</h1>
          <p className="text-gray-500 text-sm mt-1">Müşteri Paneli</p>
        </div>

        <Card className="shadow-lg border-emerald-100">
          <CardHeader>
            <CardTitle className="text-xl">Giriş Yap</CardTitle>
            <CardDescription>Müşteri hesabınızla siparişlerinizi yönetin</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 h-11" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  'Giriş Yap'
                )}
              </Button>
              <p className="text-center text-sm text-gray-500">
                Hesabınız yok mu?{' '}
                <Link href="/register" className="text-emerald-600 font-medium hover:underline">Kayıt Ol</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
