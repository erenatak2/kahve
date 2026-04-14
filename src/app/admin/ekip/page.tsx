import { prisma } from '@/lib/prisma'
import EkipYonetimiClient from './EkipYonetimiClient'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ekip Yönetimi | Satış Yönetim'
}

async function getTeamData() {
  // 1. Ekip üyelerini çek (Admin ve Satıcı)
  const teamMembers = await prisma.user.findMany({
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

  const memberIds = teamMembers.map(m => m.id)

  // 2. Müşteri sayılarını toplu çek
  const customerCounts = await prisma.customer.groupBy({
    by: ['salesRepId'],
    _count: { id: true },
    where: {
      isActive: true,
      salesRepId: { in: memberIds }
    }
  })

  // 3. Sipariş istatistiklerini toplu çek
  const orderStatsByMember = await prisma.order.groupBy({
    by: ['customerId'], // Siparişler müşteriye bağlı, müşteri de satıcıya
    _sum: { totalAmount: true },
    _count: { id: true },
    where: {
      status: { not: 'IPTAL' },
      customer: { salesRepId: { in: memberIds } }
    }
  })

  // 4. Müşteri -> Satıcı eşleşmesi için yardımcı veri
  const customerMapping = await prisma.customer.findMany({
    where: { salesRepId: { in: memberIds } },
    select: { id: true, salesRepId: true }
  })

  // 5. İstatistikleri satıcı bazlı topla
  const statsMap: Record<string, any> = {}
  
  memberIds.forEach(id => {
    statsMap[id] = { totalSales: 0, orderCount: 0, customerCount: 0 }
  })

  // Müşteri sayılarını ekle
  customerCounts.forEach(c => {
    if (c.salesRepId) {
      statsMap[c.salesRepId].customerCount = c._count.id
    }
  })

  // Siparişleri ekle
  orderStatsByMember.forEach(stat => {
    const mapping = customerMapping.find(m => m.id === stat.customerId)
    if (mapping?.salesRepId) {
      statsMap[mapping.salesRepId].totalSales += stat._sum.totalAmount || 0
      statsMap[mapping.salesRepId].orderCount += stat._count.id || 0
    }
  })

  // 6. Verileri birleştir
  return teamMembers.map(member => ({
    ...member,
    stats: statsMap[member.id] || { totalSales: 0, orderCount: 0, customerCount: 0 }
  }))
}

export default async function EkipYonetimiPage() {
  const teamData = await getTeamData()
  const serializedData = JSON.parse(JSON.stringify(teamData))

  return <EkipYonetimiClient initialTeam={serializedData} />
}
