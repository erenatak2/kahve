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
  const { phone, address, shippingAddress, city, taxNumber } = await req.json()

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { phone, address, shippingAddress, city, taxNumber },
  })

  return NextResponse.json(customer)
}
