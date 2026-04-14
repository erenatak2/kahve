import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import KontaklarClient from './KontaklarClient'

export default async function KontaklarPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role

  if (!session || (role !== 'ADMIN' && role !== 'SATICI')) {
    redirect('/auth/login')
  }

  const userId = (session.user as any).id
  const whereClause: any = { isActive: true }

  if (role === 'SATICI') {
    whereClause.customer = { salesRepId: userId }
  }

  // 1. Kontakları çek
  const contacts = await prisma.contact.findMany({
    where: whereClause,
    include: {
      customer: {
        select: {
          id: true,
          businessName: true,
          user: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // 2. Müşterileri çek (Dropdown için)
  const customerWhere: any = { isActive: true }
  if (role === 'SATICI') {
    customerWhere.salesRepId = userId
  }

  const customers = await prisma.customer.findMany({
    where: customerWhere,
    select: {
      id: true,
      businessName: true,
      user: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const serializedContacts = JSON.parse(JSON.stringify(contacts))
  const serializedCustomers = JSON.parse(JSON.stringify(customers))

  return (
    <KontaklarClient 
      initialContacts={serializedContacts} 
      customers={serializedCustomers}
      session={session}
    />
  )
}
