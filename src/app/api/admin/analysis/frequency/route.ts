import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    include: {
      orders: {
        where: { status: { not: 'IPTAL' } },
        orderBy: { createdAt: 'desc' },
        take: 6
      }
    }
  })

  const results = []

  for (const customer of customers) {
    if (customer.orders.length < 2) continue

    // Siparişler arası gün farklarını hesapla
    const intervals = []
    for (let i = 0; i < customer.orders.length - 1; i++) {
      const current = new Date(customer.orders[i].createdAt).getTime()
      const previous = new Date(customer.orders[i+1].createdAt).getTime()
      const diffDays = (current - previous) / (1000 * 60 * 60 * 24)
      intervals.push(diffDays)
    }

    const avgDays = intervals.reduce((a, b) => a + b, 0) / intervals.length
    
    // Veritabanını güncelle
    await prisma.customer.update({
      where: { id: customer.id },
      data: { avgOrderDays: avgDays }
    })

    results.push({
      customerId: customer.id,
      name: customer.businessName || 'Bilinmeyen',
      avgOrderDays: Math.round(avgDays * 10) / 10
    })
  }

  return NextResponse.json(results)
}
