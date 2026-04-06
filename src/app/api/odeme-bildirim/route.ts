import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'MUSTERI') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const customerId = (session.user as any).customerId
  const { orderId, amount, bankName, senderName, notes, receiptUrl } = await req.json()

  if (!orderId || !amount) {
    return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
  }

  // Siparişin bu müşteriye ait olduğunu kontrol et
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId }
  })

  if (!order) {
    return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
  }

  const notification = await prisma.paymentNotification.create({
    data: {
      orderId,
      customerId,
      amount: parseFloat(amount),
      bankName,
      senderName,
      notes,
      receiptUrl,
      status: 'BEKLIYOR'
    }
  })

  return NextResponse.json(notification, { status: 201 })
}
