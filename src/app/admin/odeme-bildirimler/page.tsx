import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import OdemeBildirimlerClient from './OdemeBildirimlerClient'

export default async function OdemeBildirimlerPage() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user as any).role !== 'ADMIN') {
    redirect('/auth/login')
  }

  const notifications = await prisma.paymentNotification.findMany({
    include: {
      order: {
        include: {
          customer: {
            include: {
              user: { select: { name: true, email: true } }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Decimal ve Date nesnelerini JSON-safe hale getir
  const serializedNotifications = JSON.parse(JSON.stringify(notifications))

  return (
    <OdemeBildirimlerClient 
      initialNotifications={serializedNotifications} 
      session={session}
    />
  )
}
