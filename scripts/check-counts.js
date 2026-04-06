const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const orders = await prisma.order.findMany({
    where: { status: 'HAZIRLANIYOR' },
    include: { customer: { include: { user: true } } }
  })
  
  const notifications = await prisma.paymentNotification.findMany({
    where: { status: 'BEKLIYOR' }
  })
  
  console.log('HAZIRLANIYOR sipariş sayısı:', orders.length)
  console.log('BEKLIYOR bildirim sayısı:', notifications.length)
  
  if (orders.length > 0) {
    console.log('\nSiparişler:')
    orders.forEach(o => {
      console.log(`  - ${o.orderNumber || o.id}: ${o.customer?.user?.name || 'N/A'}`)
    })
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
