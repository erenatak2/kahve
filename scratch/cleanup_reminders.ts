import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const c = await prisma.customer.updateMany({
    where: { followUpStatus: 'BEKLIYOR' },
    data: { 
      followUpStatus: 'ARANDI',
      nextCallDate: null 
    }
  })

  const o = await prisma.order.updateMany({
    where: { followupStatus: 'BEKLIYOR' },
    data: { 
      followupStatus: 'ARANDI' 
    }
  })

  console.log('Cleanup complete:', { 
    customersUpdated: c.count, 
    ordersUpdated: o.count 
  })
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
