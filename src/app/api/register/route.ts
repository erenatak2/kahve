import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { name, email, password, phone, address, shippingAddress, city, taxNumber } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Ad, e-posta ve şifre zorunludur' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Bu e-posta adresi zaten kayıtlı' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: 'MUSTERI',
      customer: {
        create: {
          phone: phone || null,
          address: address || null,
          shippingAddress: shippingAddress || null,
          city: city || null,
          taxNumber: taxNumber || null,
        },
      },
    },
  })

  return NextResponse.json({ success: true, userId: user.id }, { status: 201 })
}
