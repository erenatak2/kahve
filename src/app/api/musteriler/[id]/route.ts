import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      customerPrices: { include: { product: true } },
      orders: {
        include: { orderItems: { include: { product: true } }, payments: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!customer) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })
  return NextResponse.json(customer)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { phone, address, city, taxNumber, discountRate, notes, isActive, name, salesRepId } = await req.json()

  const customer = await prisma.customer.update({
    where: { id: params.id },
    data: { 
      phone, 
      address, 
      city, 
      taxNumber, 
      discountRate, 
      notes, 
      isActive,
      salesRepId: salesRepId || undefined
    },
    include: { user: true },
  })

  if (name) {
    await prisma.user.update({ where: { id: customer.userId }, data: { name } })
  }

  return NextResponse.json(customer)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }
  await prisma.customer.update({ where: { id: params.id }, data: { isActive: false } })
  return NextResponse.json({ success: true })
}
