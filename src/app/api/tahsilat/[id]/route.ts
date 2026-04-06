import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  const { status, paidAt, amount, method, notes, splitRemainder, isAdjustment } = await req.json()

  // Mevcut tahsilatı al
  const currentPayment = await prisma.payment.findUnique({
    where: { id: params.id }
  })

  if (!currentPayment) {
    return NextResponse.json({ error: 'Tahsilat bulunamadı' }, { status: 404 })
  }

  // Özel Düzeltme Mantığı (Cumulative collection update)
  if (isAdjustment) {
    // 1. Fark kadar (delta) yeni bir ÖDENDİ kaydı oluştur (Geçmişi bozmamak için)
    const adjustment = await prisma.payment.create({
      data: {
        orderId: currentPayment.orderId,
        amount: amount, // Bu zaten front-end'den gelen delta
        status: status || 'ODENDI',
        paidAt: new Date(),
        method: method || 'NAKIT',
        notes: notes || 'Tahsilat Ayarı'
      }
    })

    // 2. Siparişin toplam bakiyesini kapatmak/açmak için kontrol yap
    const fullOrder = await prisma.order.findUnique({
      where: { id: currentPayment.orderId },
      include: { payments: true }
    })

    if (fullOrder) {
      const totalPaid = fullOrder.payments
        .filter(p => p.status === 'ODENDI')
        .reduce((sum, p) => sum + p.amount, 0)
      
      const balance = fullOrder.totalAmount - totalPaid

      // Bekleyen kaydı bul veya oluştur
      const pendingPayment = fullOrder.payments.find(p => p.status === 'BEKLIYOR' || p.status === 'GECIKTI')

      if (balance > 0) {
        if (pendingPayment) {
          await prisma.payment.update({
            where: { id: pendingPayment.id },
            data: { amount: balance }
          })
        } else {
          await prisma.payment.create({
            data: {
              orderId: fullOrder.id,
              amount: balance,
              status: 'BEKLIYOR',
              dueDate: currentPayment.dueDate || new Date(),
              notes: 'Bakiye (Düzeltme Sonrası)'
            }
          })
        }
      } else if (pendingPayment) {
        // Borç kapandıysa bekleyen kaydı sil
        await prisma.payment.delete({ where: { id: pendingPayment.id } })
      }
    }

    return NextResponse.json(adjustment)
  }

  // Eski Kısmi ödeme mantığı (Geriye dönük uyumluluk için korundu)
  if (status === 'ODENDI' && amount > 0 && amount < currentPayment.amount && splitRemainder !== false) {
    const remainder = currentPayment.amount - amount
    
    // Mevcut kaydı çekilen miktar kadar güncelle ve "ODENDI" yap
    const updated = await prisma.payment.update({
      where: { id: params.id },
      data: {
        amount,
        status: 'ODENDI',
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        method,
        notes: notes || currentPayment.notes
      }
    })

    // Kalan miktar için YENİ bir "BEKLIYOR" kaydı oluştur
    await prisma.payment.create({
      data: {
        orderId: currentPayment.orderId,
        amount: remainder,
        status: 'BEKLIYOR',
        method: currentPayment.method,
        dueDate: currentPayment.dueDate,
        notes: 'Kalan Borç (Kısmi Tahsilat Sonrası)'
      }
    })

    return NextResponse.json(updated)
  }

  // Normal güncelleme
  const payment = await prisma.payment.update({
    where: { id: params.id },
    data: {
      status,
      paidAt: paidAt ? new Date(paidAt) : status === 'ODENDI' ? new Date() : undefined,
      amount: amount !== undefined ? amount : undefined,
      method,
      notes,
    },
  })

  return NextResponse.json(payment)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }

  await prisma.payment.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
