import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const role = (session.user as any).role
  const customerId = (session.user as any).customerId

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year')
  const all = searchParams.get('all') === 'true'

  const where: any = {}

  if (role === 'MUSTERI') {
    where.order = { customerId }
  } else if (role === 'SATICI') {
    // Satıcı sadece kendi müşterilerinin tahsilatlarını görebilir
    where.order = { customer: { salesRepId: (session.user as any).id } }
  } else {
    // Admin case: see everything ONLY if ?all=true is provided
    if (all) {
      // No filter, see all
    } else if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1)
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)
      where.OR = [
        { dueDate: { gte: start, lte: end } },
        { dueDate: null, createdAt: { gte: start, lte: end } },
      ]
    } else if (customerId) {
      // If admin is also a customer, show their own data by default
      where.order = { customerId }
    } else {
      // Not a customer, not asking for "all", show nothing
      where.id = 'none'
    }
  }

  if (role !== 'MUSTERI') {
    await prisma.payment.updateMany({
      where: { status: 'BEKLIYOR', dueDate: { lt: new Date() } },
      data: { status: 'GECIKTI' },
    })
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      order: {
        include: { 
          customer: { include: { user: { select: { name: true } } } },
          orderItems: {
            include: { product: { select: { name: true } } }
          }
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(payments)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { orderId, amount, method, dueDate, notes } = await req.json()

  // Sipariş bilgisini al
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true }
  })

  if (!order) {
    return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
  }

  // Toplam ödenen tutarı hesapla (ODENDI durumundakiler)
  const alreadyPaid = order.payments
    .filter(p => p.status === 'ODENDI')
    .reduce((sum, p) => sum + p.amount, 0)

  // Yeni tahsilatı ekle
  const totalAfterPayment = alreadyPaid + amount

  // Eğer toplam ödeme sipariş tutarına eşit veya fazlaysa, ODENDI olarak işaretle
  const shouldMarkAsPaid = totalAfterPayment >= order.totalAmount

  const payment = await prisma.payment.create({
    data: { 
      orderId, 
      amount, 
      method, 
      dueDate: dueDate ? new Date(dueDate) : null, 
      notes,
      status: shouldMarkAsPaid ? 'ODENDI' : 'BEKLIYOR',
      paidAt: shouldMarkAsPaid ? new Date() : null
    },
    include: { order: { include: { customer: { include: { user: true } } } } },
  })

  return NextResponse.json(payment, { status: 201 })
}
