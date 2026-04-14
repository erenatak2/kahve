import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import RaporlarClient from './RaporlarClient'

export default async function RaporlarPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['ADMIN', 'SATICI'].includes((session?.user as any)?.role)) {
    redirect('/auth/login')
  }

  const role = (session.user as any).role
  const userId = (session.user as any).id
  const year = new Date().getFullYear()

  // API rotasındaki 'aylik' raporu mantığını burada sunucu tarafında uyguluyoruz
  const monthlyData = []
  const orderFilter: any = role === 'SATICI' ? { customer: { salesRepId: userId } } : {}

  // Performans için siparişleri bir kerede çek ve ay bazlı grupla
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31, 23, 59, 59)

  const allOrders = await prisma.order.findMany({
    where: {
      status: { not: 'IPTAL' },
      ...orderFilter,
      OR: [
        { orderDate: { gte: yearStart, lte: yearEnd } },
        { createdAt: { gte: yearStart, lte: yearEnd } }
      ]
    },
    include: {
      payments: {
        where: { status: 'ODENDI' }
      }
    }
  })

  // 12 ayı doldur
  for (let month = 1; month <= 12; month++) {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)

    const monthOrders = allOrders.filter(o => {
      const d = new Date(o.orderDate || o.createdAt)
      return d >= start && d <= end
    })

    const totalSales = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    const totalPayments = monthOrders.reduce((sum, o) => 
      sum + o.payments.reduce((s, p) => s + p.amount, 0), 0
    )

    monthlyData.push({
      month,
      totalSales,
      totalPayments,
      orderCount: monthOrders.length
    })
  }

  // JSON-safe hale getir
  const serializedData = JSON.parse(JSON.stringify(monthlyData))

  return (
    <RaporlarClient 
      initialData={serializedData} 
      initialYear={year}
      session={session}
    />
  )
}
