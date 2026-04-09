import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const role = (session.user as any).role
  const customerId = (session.user as any).customerId
  const { searchParams } = new URL(req.url)
  const filterCustomerId = searchParams.get('customerId')

  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  let dateFilter: any = {}
  if (startDate || endDate) {
    dateFilter.createdAt = {}
    if (startDate) dateFilter.createdAt.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.createdAt.lte = end
    }
  }

  let where: any = { ...dateFilter }
  if (role === 'MUSTERI') {
    where.customerId = customerId
  } else if (role === 'SATICI') {
    where.customer = { salesRepId: (session.user as any).id }
    if (filterCustomerId) where.customerId = filterCustomerId
  } else {
    if (filterCustomerId) where.customerId = filterCustomerId
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: { include: { user: { select: { name: true } } } },
      orderItems: { include: { product: true } },
      payments: true,
      paymentNotifications: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(orders)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const role = (session.user as any).role
  const sessionCustomerId = (session.user as any).customerId
  const body = await req.json()
  const { customerId: bodyCustomerId, items, notes, billingAddress, shippingAddress, paymentMethod } = body

  // Müşteri kendi sipariş veriyorsa session'dan, yoksa request'ten al (Admin/Satıcı)
  const customerId = role === 'MUSTERI' ? sessionCustomerId : bodyCustomerId

  const customerPrices = await prisma.customerPrice.findMany({ where: { customerId } })
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })

  // Eğer shippingAddress gönderilmemişse, müşterinin shippingAddress'ini kullan
  const finalShippingAddress = shippingAddress || (customer as any)?.shippingAddress || customer?.address

  const orderItems = await Promise.all(
    items.map(async (item: { productId: string; quantity: number; unitPrice?: number }) => {
      const product = await prisma.product.findUnique({ where: { id: item.productId } })
      if (!product) throw new Error(`Ürün bulunamadı: ${item.productId}`)

      const customPrice = customerPrices.find((cp: { productId: string; price: number }) => cp.productId === item.productId)
        let unitPrice = item.unitPrice ?? customPrice?.price ?? product.salePrice
        if (!customPrice && customer?.discountRate && customer.discountRate > 0) {
          unitPrice = product.salePrice * (1 - customer.discountRate / 100)
        }

        unitPrice = unitPrice * 1.2 // %20 KDV ekle

        return { productId: item.productId, quantity: item.quantity, unitPrice, total: unitPrice * item.quantity }
      })
    )

    const totalAmount = orderItems.reduce((sum, item) => sum + item.total, 0)

  // Sipariş numarası üret: SP-YYYYMMDD-XXXX
  const now = new Date()
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.order.count()
  const seq = String(count + 1).padStart(4, '0')
  const orderNumber = `SP-${datePart}-${seq}`

  // Sipariş oluştur
  const order = await prisma.order.create({
    data: {
      customerId,
      notes,
      totalAmount,
      orderNumber,
      billingAddress,
      shippingAddress: finalShippingAddress,
      paymentMethod,
      orderItems: { create: orderItems },
    } as any,
    include: { orderItems: { include: { product: true } }, customer: { include: { user: true } }, payments: true },
  })

  // Sipariş ödemesini otomatik oluştur (BEKLIYOR durumunda)
  await prisma.payment.create({
    data: {
      orderId: order.id,
      amount: totalAmount,
      status: 'BEKLIYOR',
      method: 'HAVALE', // Varsayılan olarak havalе
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 gün vade
    },
  })

  // Güncellenmiş siparişi döndür (payment dahil)
  const updatedOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: { orderItems: { include: { product: true } }, customer: { include: { user: true } }, payments: true },
  })

  return NextResponse.json(updatedOrder, { status: 201 })
}
