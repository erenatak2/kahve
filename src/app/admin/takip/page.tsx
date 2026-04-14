import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TakipClient from './TakipClient'

export default async function TakipPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['ADMIN', 'SATICI'].includes((session?.user as any)?.role)) {
    redirect('/auth/login')
  }

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

  // 2. Müşteri bazlı takip hatırlatıcıları
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

  // Formatları birleştir (API rotasındaki formatın aynısı)
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

  const combined = [...formattedOrders, ...formattedCustomers]
  combined.sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime())

  // JSON-safe hale getir
  const serializedReminders = JSON.parse(JSON.stringify(combined))

  return (
    <TakipClient 
      initialReminders={serializedReminders} 
      session={session}
    />
  )
}
