import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }
  await prisma.product.update({ where: { id: params.id }, data: { isActive: true } })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { orderItems: true, customerPrices: true },
  })

  if (!product) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })

  // Cascade delete: önce ilişkili kayıtlar, sonra ürün
  await prisma.orderItem.deleteMany({ where: { productId: params.id } })
  await prisma.customerPrice.deleteMany({ where: { productId: params.id } })
  await prisma.product.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
