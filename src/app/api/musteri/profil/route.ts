import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const customerId = (session.user as any).customerId
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { user: { select: { name: true, email: true } } },
  })

  if (!customer) return NextResponse.json({ error: 'Müşteri bulunamadı' }, { status: 404 })
  return NextResponse.json(customer)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const customerId = (session.user as any).customerId
  const userId = (session.user as any).id
  const { name, email, phone, address, shippingAddress, city, taxNumber } = await req.json()

  // E-posta çakışması kontrolü
  if (email) {
    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } }
    })
    if (existing) {
      return NextResponse.json({ error: 'Bu e-posta adresi zaten kullanımda' }, { status: 400 })
    }
  }

  // Transaction ile hem user'ı hem customer'ı güncelle
  const [user, customer] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { ...(name ? { name } : {}), ...(email ? { email } : {}) }
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { phone, address, shippingAddress, city, taxNumber },
    })
  ])

  return NextResponse.json({ ...customer, user })
}
