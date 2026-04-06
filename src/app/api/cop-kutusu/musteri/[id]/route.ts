import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }
  await prisma.customer.update({ where: { id: params.id }, data: { isActive: true } })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: { orders: { include: { orderItems: true, payments: true } } },
  })

  if (!customer) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })

  // Cascade delete: önce sipariş öğeleri ve ödemeleri, sonra siparişler, sonra customer ve user
  for (const order of customer.orders) {
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } })
    await prisma.payment.deleteMany({ where: { orderId: order.id } })
  }
  await prisma.order.deleteMany({ where: { customerId: params.id } })
  await prisma.customerPrice.deleteMany({ where: { customerId: params.id } })
  await prisma.user.delete({ where: { id: customer.userId } })

  return NextResponse.json({ success: true })
}
