import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import SiparislerClient from './SiparislerClient'

export default async function SiparislerPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['ADMIN', 'SATICI'].includes((session?.user as any)?.role)) {
    redirect('/auth/login')
  }

  const userId = (session?.user as any)?.id
  const role = (session?.user as any)?.role

  // Verileri çek - Satici ise sadece kendi müşterilerinin siparişlerini görsün
  const [orders, customers, products] = await Promise.all([
    prisma.order.findMany({
      where: role === 'ADMIN' ? {} : {
        customer: {
          salesRepId: userId
        }
      },
      include: {
        customer: {
          include: {
            user: true
          }
        },
        orderItems: {
          include: {
            product: true
          }
        },
        payments: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.customer.findMany({
      where: role === 'ADMIN' ? {} : {
        salesRepId: userId
      },
      include: {
        user: true,
        customerPrices: true
      }
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })
  ])

  // Decimal ve Date nesnelerini JSON-safe hale getir
  const serializedOrders = JSON.parse(JSON.stringify(orders))
  const serializedCustomers = JSON.parse(JSON.stringify(customers))
  const serializedProducts = JSON.parse(JSON.stringify(products))

  return (
    <SiparislerClient 
      initialOrders={serializedOrders} 
      initialCustomers={serializedCustomers} 
      initialProducts={serializedProducts}
      session={session}
    />
  )
}
