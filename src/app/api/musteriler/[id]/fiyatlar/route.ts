import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'SATICI')) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const prices = await prisma.customerPrice.findMany({
    where: { customerId: params.id },
    include: { product: { select: { id: true, name: true, salePrice: true, category: true, unit: true } } }
  })

  return NextResponse.json(prices)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { productId, price } = await req.json()

  const customerPrice = await prisma.customerPrice.upsert({
    where: { customerId_productId: { customerId: params.id, productId } },
    update: { price },
    create: { customerId: params.id, productId, price },
  })

  return NextResponse.json(customerPrice)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { productId } = await req.json()

  await prisma.customerPrice.delete({
    where: { customerId_productId: { customerId: params.id, productId } },
  })

  return NextResponse.json({ success: true })
}
