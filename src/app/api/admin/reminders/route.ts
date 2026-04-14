import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const role = (session.user as any).role
  const userId = (session.user as any).id
  const now = new Date()

  // 1. Sipariş bazlı hatırlatıcılar
  const orderReminders = await prisma.order.findMany({
    where: {
      reminderAt: { not: null, lte: now },
      followupStatus: 'BEKLIYOR',
      ...(role === 'SATICI' && { customer: { salesRepId: userId } })
    },
    include: {
      customer: { include: { user: { select: { name: true, email: true } } } }
    },
    orderBy: { reminderAt: 'asc' }
  })

  // 2. Müşteri bazlı (YENİ) takip hatırlatıcıları
  const customerReminders = await prisma.customer.findMany({
    where: {
      nextCallDate: { not: null, lte: now },
      followUpStatus: 'BEKLIYOR',
      ...(role === 'SATICI' && { salesRepId: userId })
    },
    include: {
      user: { select: { name: true, email: true } }
    },
    orderBy: { nextCallDate: 'asc' }
  })

  // Formatları birleştir
  const formattedOrders = orderReminders.map(o => ({
    id: o.id,
    type: 'ORDER',
    customerId: o.customerId,
    customerName: o.customer?.businessName || o.customer?.user?.name,
    phone: o.customer?.phone,
    note: o.reminderNote,
    date: o.reminderAt
  }))

  const formattedCustomers = customerReminders.map(c => ({
    id: c.id,
    type: 'CUSTOMER',
    customerId: c.id,
    customerName: c.businessName || c.user?.name,
    phone: c.phone,
    note: 'Düzenli Takip Araması',
    date: c.nextCallDate
  }))

  const combined = [...formattedOrders, ...formattedCustomers]
  combined.sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime())
  return NextResponse.json(combined)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const url = new URL(req.url)
  const idFromQuery = url.searchParams.get('id')
  
  const body = await req.json().catch(() => ({}))
  const id = idFromQuery || body.id
  const type = body.type || 'ORDER' // 'ORDER' veya 'CUSTOMER'
  const status = body.status || 'ARANDI'

  if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

  if (type === 'CUSTOMER') {
    await prisma.customer.update({
      where: { id },
      data: { followUpStatus: status, nextCallDate: null }
    })
  } else {
    await prisma.order.update({
      where: { id },
      data: { followupStatus: status }
    })
  }

  return NextResponse.json({ success: true })
}
