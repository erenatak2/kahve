const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('KDV Güncelleme operasyonu başlatılıyor...')

  // 1. Tüm sipariş kalemlerini %20 artır
  const orderItems = await prisma.orderItem.findMany()
  console.log(`${orderItems.length} adet sipariş kalemi bulundu.`)
  
  for (const item of orderItems) {
    await prisma.orderItem.update({
      where: { id: item.id },
      data: {
        unitPrice: item.unitPrice * 1.2,
        total: item.total * 1.2
      }
    })
  }

  // 2. Tüm ana sipariş toplamlarını %20 artır
  const orders = await prisma.order.findMany()
  console.log(`${orders.length} adet sipariş güncelleniyor...`)
  
  for (const order of orders) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        totalAmount: order.totalAmount * 1.2
      }
    })
  }

  // 3. Tüm ödeme kayıtlarını %20 artır
  const payments = await prisma.payment.findMany()
  console.log(`${payments.length} adet ödeme kaydı güncelleniyor...`)
  
  for (const payment of payments) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        amount: payment.amount * 1.2
      }
    })
  }

  console.log('Başarıyla tamamlandı! Tüm veriler %20 KDV eklendi.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
