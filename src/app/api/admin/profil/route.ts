import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { name, email } = await req.json()

  if (!name || !email) {
    return NextResponse.json({ error: 'İsim ve e-posta zorunludur' }, { status: 400 })
  }

  // Mevcut admini bul
  const currentEmail = session.user?.email as string
  const user = await prisma.user.findUnique({
    where: { email: currentEmail },
  })

  if (!user) {
    return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
  }

  // Eğer e-posta değişiyorsa, çakışma var mı diye bak
  if (email !== currentEmail) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Bu e-posta adresi zaten kullanımda' }, { status: 400 })
    }
  }

  // Güncelle
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name, email }
  })

  return NextResponse.json({ 
    message: 'Profil başarıyla güncellendi', 
    user: { name: updated.name, email: updated.email } 
  })
}
