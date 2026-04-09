import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      customer: { include: { user: { select: { name: true, email: true } }, } },
      orderItems: { include: { product: true } },
      payments: true,
    },
  })

  if (!order) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })

  const role = (session.user as any).role
  const customerId = (session.user as any).customerId
  if (role === 'MUSTERI' && order.customerId !== customerId) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  return NextResponse.json(order)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { status, notes, cargoCompany, trackingNumber, orderDate, reminderAt, reminderNote } = await req.json()
  const role = (session.user as any).role
  const customerId = (session.user as any).customerId

  const existing = await prisma.order.findUnique({
    where: { id: params.id },
    include: { orderItems: true },
  })

  if (!existing) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })

  // Müşteri sadece kendi siparişini ve sadece IPTAL yapabilir
  if (role === 'MUSTERI') {
    if (existing.customerId !== customerId) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }
    if (status !== 'IPTAL') {
      return NextResponse.json({ error: 'Sadece iptal edebilirsiniz' }, { status: 403 })
    }
  }

  // Stok yönetimi: Sadece TESLIM_EDILDI durumunda stok azalt
  if (status === 'TESLIM_EDILDI' && existing.status !== 'TESLIM_EDILDI') {
    await Promise.all(
      existing.orderItems.map((item: { productId: string; quantity: number }) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      )
    )
  }

  // İptal durumunda: Sadece TESLIM_EDILDI'den geliyorsa stok geri ekle
  if (status === 'IPTAL' && existing.status === 'TESLIM_EDILDI') {
    await Promise.all(
      existing.orderItems.map((item: { productId: string; quantity: number }) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      )
    )
  }

  const order = await prisma.order.update({
    where: { id: params.id },
    data: { 
      status, 
      notes, 
      orderDate, 
      reminderAt,
      reminderNote,
      ...(cargoCompany !== undefined && { cargoCompany }), 
      ...(trackingNumber !== undefined && { trackingNumber }) 
    } as any,
    include: { orderItems: { include: { product: true } }, payments: true, customer: { include: { user: true } } },
  })

  return NextResponse.json(order)
}
