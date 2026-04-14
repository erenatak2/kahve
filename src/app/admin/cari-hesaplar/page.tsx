import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import CariHesaplarClient from './CariHesaplarClient'

export default async function CariHesaplarPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['ADMIN', 'SATICI'].includes((session?.user as any)?.role)) {
    redirect('/auth/login')
  }

  const userId = (session?.user as any)?.id
  const role = (session?.user as any)?.role

  // Verileri çek - Satici ise sadece kendi müşterilerinin carilerini görsün
  const customers = await prisma.customer.findMany({
    where: role === 'ADMIN' ? {} : {
      salesRepId: userId
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        }
      },
      orders: {
        select: {
          totalAmount: true,
          status: true,
        }
      }
    },
    orderBy: {
      user: {
        name: 'asc'
      }
    }
  })

  // Decimal ve Date nesnelerini JSON-safe hale getir
  const serializedCustomers = JSON.parse(JSON.stringify(customers))

  return (
    <CariHesaplarClient 
      initialCustomers={serializedCustomers} 
      session={session}
    />
  )
}
