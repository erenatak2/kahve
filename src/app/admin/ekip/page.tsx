import { prisma } from '@/lib/prisma'
import EkipYonetimiClient from './EkipYonetimiClient'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ekip Yönetimi | Satış Yönetim'
}

async function getTeamData() {
  const team = await prisma.user.findMany({
    where: { 
      role: { in: ['ADMIN', 'SATICI'] } 
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })

  const teamWithStats = await Promise.all(team.map(async (member) => {
    const orderStats = await prisma.order.aggregate({
      where: {
        status: { not: 'IPTAL' },
        customer: { salesRepId: member.id }
      },
      _sum: { totalAmount: true },
      _count: { id: true }
    })

    const customerCount = await prisma.customer.count({
      where: { salesRepId: member.id, isActive: true }
    })

    return {
      ...member,
      stats: {
        totalSales: orderStats._sum.totalAmount || 0,
        orderCount: orderStats._count.id || 0,
        customerCount: customerCount
      }
    }
  }))

  return teamWithStats
}

export default async function EkipYonetimiPage() {
  const teamData = await getTeamData()

  return <EkipYonetimiClient initialTeam={teamData} />
}
