import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'MUSTERI') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const customerId = (session.user as any).customerId
  const { currentPassword, newPassword } = await req.json()

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Tüm alanları doldurun' }, { status: 400 })
  }

  if (newPassword.length < 4) {
    return NextResponse.json({ error: 'Yeni şifre en az 4 karakter olmalı' }, { status: 400 })
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { user: true },
  })

  if (!customer || !customer.user) {
    return NextResponse.json({ error: 'Müşteri bulunamadı' }, { status: 404 })
  }

  const isValid = await bcrypt.compare(currentPassword, customer.user.password)
  if (!isValid) {
    return NextResponse.json({ error: 'Mevcut şifre yanlış' }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: customer.user.id },
    data: { password: hashedPassword },
  })

  return NextResponse.json({ message: 'Şifre başarıyla değiştirildi' })
}
