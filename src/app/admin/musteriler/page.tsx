import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import MusterilerClient from './MusterilerClient'

export default async function MusterilerPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['ADMIN', 'SATICI'].includes((session?.user as any)?.role)) {
    redirect('/auth/login')
  }

  const role = (session.user as any).role
  const userId = (session.user as any).id

  // Dashboard verisi çekme mantığıyla aynı paralellikte, ancak müşteriler sayfası detayıyla
  const whereClause: any = { isActive: true }
  if (role === 'SATICI') {
    whereClause.salesRepId = userId
  }

  const [customers, products, staff] = await Promise.all([
    prisma.customer.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
        salesRep: { select: { id: true, name: true } },
        orders: { 
          select: { 
            totalAmount: true, 
            payments: { select: { amount: true, status: true } } 
          } 
        },
        _count: { select: { customerPrices: true } }
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    }),
    role === 'ADMIN' ? prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SATICI'] } },
      select: { id: true, name: true, role: true }
    }) : Promise.resolve([])
  ])

  // Prisma verilerini JSON-safe hale getir (Date nesnelerini stringe çevir)
  const serializedCustomers = JSON.parse(JSON.stringify(customers))
  const serializedProducts = JSON.parse(JSON.stringify(products))
  const serializedStaff = JSON.parse(JSON.stringify(staff))

  return (
    <MusterilerClient 
      initialCustomers={serializedCustomers} 
      initialProducts={serializedProducts}
      initialStaff={serializedStaff}
      session={session}
    />
  )
}
