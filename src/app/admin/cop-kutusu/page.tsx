import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import CopKutusuClient from './CopKutusuClient'

export default async function CopKutusuPage() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user as any).role !== 'ADMIN') {
    redirect('/auth/login')
  }

  const [customers, products] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: false },
      include: {
        user: { select: { id: true, name: true, email: true } },
        orders: { select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.product.findMany({
      where: { isActive: false },
      include: { orderItems: { select: { id: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  // JSON-safe hale getir
  const serializedData = JSON.parse(JSON.stringify({ customers, products }))

  return (
    <CopKutusuClient 
      initialData={serializedData} 
      session={session}
    />
  )
}
