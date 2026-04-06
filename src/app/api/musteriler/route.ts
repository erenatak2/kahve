import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
      orders: { select: { id: true, totalAmount: true, status: true, createdAt: true, payments: { select: { amount: true, status: true } } } },
      customerPrices: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(customers)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { name, email, password, phone, address, shippingAddress, city, taxNumber, discountRate, notes } = await req.json()

  if (!name || !email) return NextResponse.json({ error: 'Ad ve e-posta zorunlu' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Bu e-posta adresi zaten kayıtlı' }, { status: 409 })

  const hashedPassword = await bcrypt.hash(password || '123456', 10)

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'MUSTERI',
        customer: {
          create: { phone, address, shippingAddress, city, taxNumber, discountRate: discountRate || 0, notes },
        },
      },
      include: { customer: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Müşteri oluşturulamadı' }, { status: 500 })
  }
}
