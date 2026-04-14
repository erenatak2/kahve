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

  // Tüm yetkililer için sipariş istatistiklerini bir kerede çek
  const ordersGrouped = await prisma.order.groupBy({
    by: ['customerId'],
    where: { status: { not: 'IPTAL' } },
    _sum: { totalAmount: true },
    _count: { id: true }
  })

  // Tüm aktif müşterileri temsilcileriyle birlikte çek
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, salesRepId: true }
  })

  // Müşteri ID -> Satış Temsilcisi mapping'i oluştur
  const customerToRep: Record<string, string> = {}
  customers.forEach(c => {
    if (c.salesRepId) customerToRep[c.id] = c.salesRepId
  })

  // Sipariş istatistiklerini temsilcilere göre grupla
  const repStats: Record<string, { totalSales: number, orderCount: number, customerCount: number }> = {}
  
  // Önce müşteri sayılarını ata
  customers.forEach(c => {
    if (c.salesRepId) {
      if (!repStats[c.salesRepId]) repStats[c.salesRepId] = { totalSales: 0, orderCount: 0, customerCount: 0 }
      repStats[c.salesRepId].customerCount++
    }
  })

  // Sonra sipariş toplamlarını ekle
  ordersGrouped.forEach(group => {
    const repId = customerToRep[group.customerId]
    if (repId) {
      if (!repStats[repId]) repStats[repId] = { totalSales: 0, orderCount: 0, customerCount: 0 }
      repStats[repId].totalSales += group._sum.totalAmount || 0
      repStats[repId].orderCount += group._count.id || 0
    }
  })

  return team.map(member => ({
    ...member,
    stats: repStats[member.id] || { totalSales: 0, orderCount: 0, customerCount: 0 }
  }))
}

export default async function EkipYonetimiPage() {
  const teamData = await getTeamData()

  return <EkipYonetimiClient initialTeam={teamData} />
}
