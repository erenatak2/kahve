const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // DFQMQC içeren siparişleri ara
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { id: { contains: 'dfqmqc' } },
        { orderNumber: { contains: 'DFQMQC' } }
      ]
    },
    include: {
      customer: { include: { user: true } },
      orderItems: { include: { product: true } }
    }
  })
  
  console.log('Bulunan siparişler:', orders.length)
  orders.forEach(o => {
    console.log('---')
    console.log('ID:', o.id)
    console.log('Sipariş No:', o.orderNumber)
    console.log('Durum:', o.status)
    console.log('Müşteri:', o.customer?.user?.name)
    console.log('Tutar:', o.totalAmount)
  })
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
