const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Veriler siliniyor...\n')

  // Önce bağlı verileri sil (foreign key ilişkileri)
  const deletedPayments = await prisma.payment.deleteMany({})
  console.log(`✓ Tahsilatlar silindi: ${deletedPayments.count}`)

  const deletedNotifications = await prisma.paymentNotification.deleteMany({})
  console.log(`✓ Ödeme bildirimleri silindi: ${deletedNotifications.count}`)

  const deletedOrderItems = await prisma.orderItem.deleteMany({})
  console.log(`✓ Sipariş kalemleri silindi: ${deletedOrderItems.count}`)

  const deletedOrders = await prisma.order.deleteMany({})
  console.log(`✓ Siparişler silindi: ${deletedOrders.count}`)

  // Cari hesap kayıtları varsa (CustomerPrice, vb.)
  const deletedCustomerPrices = await prisma.customerPrice.deleteMany({})
  console.log(`✓ Müşteri özel fiyatları silindi: ${deletedCustomerPrices.count}`)

  console.log('\n✅ Tüm veriler başarıyla silindi!')
  console.log('🔒 Ürünler ve müşteriler korundu.')
}

main()
  .catch((e) => {
    console.error('❌ Hata:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
