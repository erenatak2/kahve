import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const role = (session.user as any).role
  const userId = (session.user as any).id

  // Bugünün başı ve sonu (saat kontrolü yok, sadece gün)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  const tomorrowUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + 1))

  // 1. Sipariş bazlı hatırlatıcılar - sadece gün kontrolü
  const orderReminders = await prisma.order.findMany({
    where: {
      reminderAt: {
        gte: todayUTC,
        lt: tomorrowUTC
      },
      followupStatus: 'BEKLIYOR',
      ...(role === 'SATICI' && { customer: { salesRepId: userId } })
    },
    include: {
      customer: { include: { user: { select: { name: true, email: true } } } }
    },
    orderBy: { reminderAt: 'asc' }
  })

  // 2. Müşteri bazlı takip hatırlatıcıları - sadece gün kontrolü
  const customerReminders = await prisma.customer.findMany({
    where: {
      nextCallDate: {
        gte: todayUTC,
        lt: tomorrowUTC
      },
      followUpStatus: 'BEKLIYOR',
      ...(role === 'SATICI' && { salesRepId: userId })
    },
    include: {
      user: { select: { name: true, email: true } }
    },
    orderBy: { nextCallDate: 'asc' }
  })

  // 3. Kontak bazlı hatırlatıcılar - sadece gün kontrolü
  const contactReminders = await prisma.contact.findMany({
    where: {
      reminderAt: {
        gte: todayUTC,
        lt: tomorrowUTC
      },
      isActive: true,
      OR: [
        { customerId: null },
        { customer: { salesRepId: role === 'SATICI' ? userId : undefined } }
      ]
    },
    include: {
      customer: true
    },
    orderBy: { reminderAt: 'asc' }
  })

  // Formatları birleştir
  const formattedOrders = orderReminders.map(o => ({
    id: o.id,
    type: 'ORDER',
    customerId: o.customerId,
    customerName: o.customer?.businessName || o.customer?.user?.name,
    region: o.customer?.region,
    phone: o.customer?.phone,
    note: o.reminderNote,
    date: o.reminderAt
  }))

  const formattedCustomers = customerReminders.map(c => ({
    id: c.id,
    type: 'CUSTOMER',
    customerId: c.id,
    customerName: c.businessName || c.user?.name,
    region: c.region,
    phone: c.phone,
    note: 'Düzenli Takip Araması',
    date: c.nextCallDate
  }))

  const formattedContacts = contactReminders.map(c => ({
    id: c.id,
    type: 'CONTACT',
    customerId: c.customerId,
    customerName: c.name,
    region: c.customer?.region,
    phone: c.phone,
    note: c.notes,
    date: c.reminderAt
  }))

  const combined = [...formattedOrders, ...formattedCustomers, ...formattedContacts]
  combined.sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
  return NextResponse.json(combined)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const body = await req.json()
  const { id, type, status, clearReminder } = body

  if (!id || !type) return NextResponse.json({ error: 'ID ve type gerekli' }, { status: 400 })

  try {
    if (type === 'CONTACT') {
      await prisma.contact.update({
        where: { id },
        data: { reminderAt: clearReminder ? null : undefined }
      })
    } else if (type === 'ORDER') {
      await prisma.order.update({
        where: { id },
        data: {
          reminderAt: clearReminder ? null : undefined,
          followupStatus: status || (clearReminder ? 'ARANDI' : undefined)
        }
      })
    } else if (type === 'CUSTOMER') {
      await prisma.customer.update({
        where: { id },
        data: {
          nextCallDate: clearReminder ? null : undefined,
          followUpStatus: status || (clearReminder ? 'ARANDI' : undefined)
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Hatırlatıcı güncelleme hatası:', error)
    return NextResponse.json({ error: 'Hatırlatıcı güncellenemedi' }, { status: 500 })
  }
}
